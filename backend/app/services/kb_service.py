import os
import json
import uuid
import logging
from datetime import datetime, timezone
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

logger = logging.getLogger("requirements_ai")
from app.models.domain import Domain
from app.core.knowledge_base import ensure_collection, load_pdf, _delete_from_qdrant, _kb_path
from app.services.audit_service import log_action

ALLOWED_EXTENSIONS = {"pdf"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
MANIFEST_FILENAME = "manifest.json"


# Manifest helpers 

def _manifest_path() -> str:
    return os.path.join(_kb_path(), MANIFEST_FILENAME)


def _read_manifest() -> dict:
    path = _manifest_path()
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, IOError) as e:
        logger.error("manifest.json unreadable (%s) — returning empty manifest", e)
        return {}


def _write_manifest(manifest: dict):
    os.makedirs(_kb_path(), exist_ok=True)
    with open(_manifest_path(), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)


#  Knowledge base CRUD

def register_and_load(file_path: str, domain: str, country: str, original_name: str, entry_id: str) -> dict:
    """Save metadata to the manifest and load the PDF into Qdrant. Returns the manifest entry."""
    ensure_collection()
    chunks = load_pdf(file_path, domain=domain, country=country, entry_id=entry_id)

    manifest = _read_manifest()
    entry = {
        "id": entry_id,
        "filename": os.path.basename(file_path),
        "domain": domain,
        "country": country.upper(),
        "original_name": original_name,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "chunks": chunks,
    }
    manifest[entry_id] = entry
    _write_manifest(manifest)
    return entry


def list_kb_files() -> list:
    manifest = _read_manifest()
    return sorted(manifest.values(), key=lambda e: e.get("uploaded_at", ""), reverse=True)


def delete_kb_file(entry_id: str) -> bool:
    """Remove from Qdrant, delete the file, update the manifest. Returns True if entry existed."""
    manifest = _read_manifest()
    entry = manifest.get(entry_id)
    if not entry:
        return False

    _delete_from_qdrant(entry_id)

    file_path = os.path.join(_kb_path(), entry["filename"])
    if os.path.exists(file_path):
        os.remove(file_path)

    del manifest[entry_id]
    _write_manifest(manifest)
    return True


def load_all():
    """
    Load all PDFs registered in the manifest into Qdrant.
    On first run (no manifest yet) auto-discovers legacy files named {country}_{domain}.pdf.
    """
    ensure_collection()
    os.makedirs(_kb_path(), exist_ok=True)
    manifest = _read_manifest()

    if not manifest:
        legacy_country_map = {"jordan": "JO", "saudi": "SA", "egypt": "EG", "uae": "AE"}
        for filename in os.listdir(_kb_path()):
            if not filename.endswith(".pdf"):
                continue
            base = filename.replace(".pdf", "").lower()
            parts = base.split("_", 1)
            if len(parts) == 2 and parts[0] in legacy_country_map:
                country = legacy_country_map[parts[0]]
                domain = parts[1].replace("_", " ").title()
            else:
                domain = base.replace("_", " ").title()
                country = "JO"

            entry_id = str(uuid.uuid4())
            file_path = os.path.join(_kb_path(), filename)
            chunks = load_pdf(file_path, domain=domain, country=country, entry_id=entry_id)
            manifest[entry_id] = {
                "id": entry_id,
                "filename": filename,
                "domain": domain,
                "country": country,
                "original_name": filename,
                "uploaded_at": datetime.now(timezone.utc).isoformat(),
                "chunks": chunks,
            }
        _write_manifest(manifest)
        return

    for entry in manifest.values():
        file_path = os.path.join(_kb_path(), entry["filename"])
        if os.path.exists(file_path):
            _delete_from_qdrant(entry["id"])
            load_pdf(file_path, domain=entry["domain"], country=entry["country"], entry_id=entry["id"])
        else:
            logger.warning("File '%s' listed in manifest but not found on disk — skipping.", entry["filename"])


# HTTP-level wrappers (called by routers) 

def list_files() -> list:
    return list_kb_files()


async def upload_file(
    file: UploadFile,
    domain: str,
    country: str,
    admin_id,
    db: Session,
    request,
) -> dict:
    ext = (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File must not exceed 50 MB.")

    domain = domain.strip()
    country = country.strip().upper()
    if not domain or not country:
        raise HTTPException(status_code=400, detail="domain and country are required.")

    if not db.query(Domain).filter(Domain.country == country).first():
        raise HTTPException(
            status_code=400,
            detail=f"Country code '{country}' does not match any existing domain. Add a domain for this country first.",
        )

    if not db.query(Domain).filter(Domain.country == country, Domain.name == domain).first():
        raise HTTPException(
            status_code=400,
            detail=f"Domain '{domain}' does not exist for country '{country}'.",
        )

    entry_id = str(uuid.uuid4())
    filename = f"{entry_id}.pdf"
    os.makedirs(_kb_path(), exist_ok=True)
    file_path = os.path.join(_kb_path(), filename)

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        entry = register_and_load(
            file_path=file_path,
            domain=domain,
            country=country,
            original_name=file.filename or filename,
            entry_id=entry_id,
        )
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to index PDF: {e}")

    log_action(
        db=db,
        user_id=admin_id,
        action="upload_kb_file",
        entity_type="knowledge_base",
        entity_id=entry["id"],
        details={"domain": domain, "country": country, "chunks": entry["chunks"]},
        request=request,
    )
    return entry


def delete_file(entry_id: str, admin_id, db: Session, request) -> dict:
    try:
        deleted = delete_kb_file(entry_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete from knowledge base: {e}")
    if not deleted:
        raise HTTPException(status_code=404, detail="Knowledge-base entry not found.")

    log_action(
        db=db,
        user_id=admin_id,
        action="delete_kb_file",
        entity_type="knowledge_base",
        entity_id=entry_id,
        details={"deleted_entry": entry_id},
        request=request,
    )
    return {"message": f"Knowledge-base entry '{entry_id}' deleted successfully."}

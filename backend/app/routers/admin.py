from fastapi import APIRouter, Depends, Request, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.services.auth_service import get_current_admin
from app.services import admin_service, audit_service, kb_service
from app.core.limiter import limiter
from app.schemas.admin import DomainCreate, DomainUpdate, QuestionCreate, QuestionUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Stats 
@router.get("/stats")
def get_stats(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.get_dashboard_stats(db)


# Users 

@router.get("/users")
def get_users(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.get_all_users_with_session_counts(db)


@router.put("/users/{user_id}/toggle-active")
@limiter.limit("20/minute")
def toggle_user_active(user_id: str, request: Request, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.toggle_user_active(user_id, admin.id, db, request)


# Sessions 

@router.get("/sessions")
def get_sessions(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.get_all_sessions_with_details(db)


# Documents

@router.get("/documents")
def get_documents(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.get_sessions_with_documents(db)


@router.get("/documents/{session_id}")
def get_document(session_id: str, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.get_document_text(session_id, db)


# Domains 

@router.get("/domains")
def get_domains(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.get_all_domains_with_session_counts(db)


@router.post("/domains")
@limiter.limit("20/minute")
def create_domain(request: Request, data: DomainCreate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.create_domain(data.name, data.name_ar, data.country, admin.id, db, request)


@router.put("/domains/{domain_id}")
@limiter.limit("20/minute")
def update_domain(domain_id: str, request: Request, data: DomainUpdate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.update_domain(domain_id, data, admin.id, db, request)


@router.delete("/domains/{domain_id}")
@limiter.limit("20/minute")
def delete_domain(domain_id: str, request: Request, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.delete_domain(domain_id, admin.id, db, request)


# ── Questions 

@router.get("/domains/{domain_id}/questions")
def get_questions(domain_id: str, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.get_questions_for_domain(domain_id, db)


@router.post("/domains/{domain_id}/questions")
@limiter.limit("20/minute")
def create_question(domain_id: str, request: Request, data: QuestionCreate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.create_question(domain_id, data.question_text, admin.id, db, request)


@router.put("/questions/{question_id}")
@limiter.limit("20/minute")
def update_question(question_id: str, request: Request, data: QuestionUpdate, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.update_question(question_id, data, admin.id, db, request)


@router.delete("/questions/{question_id}")
@limiter.limit("20/minute")
def delete_question(question_id: str, request: Request, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return admin_service.delete_question(question_id, admin.id, db, request)


# ── Audit Log 

@router.get("/audit-log")
def get_audit_log(
    page: int = 1,
    limit: int = 20,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return audit_service.get_audit_logs(db, page, limit, user_id, action, date_from, date_to)


# Login History 

@router.get("/login-history")
def get_login_history(
    page: int = 1,
    limit: int = 20,
    email: Optional[str] = None,
    success: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return audit_service.get_login_history(db, page, limit, email, success, date_from, date_to)


@router.get("/login-history/failed-attempts")
def get_failed_attempts(admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return audit_service.get_failed_login_attempts(db)


# Knowledge Base 

@router.get("/knowledge-base")
def get_kb_files(admin=Depends(get_current_admin)):
    return kb_service.list_files()


@router.post("/knowledge-base/upload")
@limiter.limit("10/minute")
async def upload_kb_file(
    request: Request,
    file: UploadFile = File(...),
    domain: str = Form(...),
    country: str = Form(...),
    admin=Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return await kb_service.upload_file(file, domain, country, admin.id, db, request)


@router.delete("/knowledge-base/{entry_id}")
@limiter.limit("20/minute")
def remove_kb_file(entry_id: str, request: Request, admin=Depends(get_current_admin), db: Session = Depends(get_db)):
    return kb_service.delete_file(entry_id, admin.id, db, request)

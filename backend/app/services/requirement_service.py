from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.requirements import Requirement, RequirementHistory
from app.models.domain import Question, UserSession, Domain
from app.schemas.requirements import RequirementItem, RequirementsResponse, ClassifiedRequirementsResponse
from app.services.ai_service import generate_requirements as ai_generate_requirements


def split_by_type(requirements: list) -> tuple:
    functional = [RequirementItem(id=r.id, code=r.code, description=r.description, type=r.type)
                  for r in requirements if r.type == "functional"]
    non_functional = [RequirementItem(id=r.id, code=r.code, description=r.description, type=r.type)
                      for r in requirements if r.type == "non_functional"]
    return functional, non_functional


def get_requirements_for_session(session_id: str, db: Session, req_type: str = None) -> list:
    query = db.query(Requirement).filter(Requirement.session_id == session_id)
    if req_type:
        query = query.filter(Requirement.type == req_type)
    return query.all()


def get_questions_for_answers(raw_answers: list, db: Session) -> dict:
    """Bulk-fetch questions for a list of answers. Returns {question_id_str: question_text}.
    Replaces N+1 query loops that queried one question per answer."""
    question_ids = [a.get("question_id") for a in raw_answers if a.get("question_id")]
    if not question_ids:
        return {}
    questions = db.query(Question).filter(Question.id.in_(question_ids)).all()
    return {str(q.id): q.question_text for q in questions}


def generate_requirements(session_id: str, document_text: str, db: Session, user_id=None) -> RequirementsResponse:
    q = db.query(UserSession).filter(UserSession.id == session_id)
    if user_id is not None:
        q = q.filter(UserSession.user_id == user_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    domain = db.query(Domain).filter(Domain.id == session.domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    if document_text:
        session.document_text = document_text
        db.flush()

    raw_answers = session.answers or []
    questions_map = get_questions_for_answers(raw_answers, db)
    answers = [
        {"question": questions_map.get(a.get("question_id"), ""), "answer": a.get("answer", "")}
        for a in raw_answers
    ]

    result = ai_generate_requirements(
        domain=domain.name,
        role=session.role,
        answers=answers,
        document_text=document_text or "",
        country=session.country or "Jordan",
    )

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    functional_data = result.get("functional", [])
    non_functional_data = result.get("non_functional", [])

    if not functional_data and not non_functional_data:
        raw_text = result.get("raw", "")
        for line in raw_text.split("\n"):
            line = line.strip()
            if line.startswith("**FR-"):
                functional_data.append(line.replace("**", ""))
            elif line.startswith("**NFR-"):
                non_functional_data.append(line.replace("**", ""))

    functional_items = []
    non_functional_items = []

    try:
        db.query(Requirement).filter(Requirement.session_id == session.id).delete()

        for req in functional_data:
            parts = req.split(":", 1)
            if len(parts) == 2:
                req_obj = Requirement(
                    session_id=session.id,
                    code=parts[0].strip(),
                    description=parts[1].strip(),
                    type="functional",
                )
                db.add(req_obj)
                db.flush()
                functional_items.append(RequirementItem(
                    id=req_obj.id, code=parts[0].strip(), description=parts[1].strip(), type="functional",
                ))

        for req in non_functional_data:
            parts = req.split(":", 1)
            if len(parts) == 2:
                req_obj = Requirement(
                    session_id=session.id,
                    code=parts[0].strip(),
                    description=parts[1].strip(),
                    type="non_functional",
                )
                db.add(req_obj)
                db.flush()
                non_functional_items.append(RequirementItem(
                    id=req_obj.id, code=parts[0].strip(), description=parts[1].strip(), type="non_functional",
                ))

        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to save requirements")

    return RequirementsResponse(
        session_id=session.id,
        functional=functional_items,
        non_functional=non_functional_items,
        total=len(functional_items) + len(non_functional_items),
    )


def add_requirement(session_id: str, req_type: str, description: str, db: Session, user_id=None) -> dict:
    q = db.query(UserSession).filter(UserSession.id == session_id)
    if user_id is not None:
        q = q.filter(UserSession.user_id == user_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if req_type not in ("functional", "non_functional"):
        raise HTTPException(status_code=400, detail="type must be 'functional' or 'non_functional'")

    prefix = "FR" if req_type == "functional" else "NFR"
    existing_codes = {
        r.code for r in db.query(Requirement.code).filter(
            Requirement.session_id == session.id
        ).all()
    }
    next_num = 1
    code = f"{prefix}-{next_num}"
    while code in existing_codes:
        next_num += 1
        code = f"{prefix}-{next_num}"

    req = Requirement(
        session_id=session.id,
        code=code,
        description=description.strip(),
        type=req_type,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def update_requirement(requirement_id: str, description: str, db: Session, user_id=None):
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if user_id is not None:
        session = db.query(UserSession).filter(
            UserSession.id == requirement.session_id, UserSession.user_id == user_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Requirement not found")

    history = RequirementHistory(
        requirement_id=requirement.id,
        old_description=requirement.description,
    )
    db.add(history)

    requirement.description = description
    requirement.is_edited = True
    requirement.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(requirement)
    return requirement


def delete_requirement(requirement_id: str, db: Session, user_id=None) -> dict:
    requirement = db.query(Requirement).filter(Requirement.id == requirement_id).first()
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    if user_id is not None:
        session = db.query(UserSession).filter(
            UserSession.id == requirement.session_id, UserSession.user_id == user_id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Requirement not found")
    db.delete(requirement)
    db.commit()
    return {"message": "Deleted"}


def get_requirements(session_id: str, user_id, db: Session) -> RequirementsResponse:
    session = db.query(UserSession).filter(UserSession.id == session_id, UserSession.user_id == user_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    requirements = get_requirements_for_session(session_id, db)
    functional, non_functional = split_by_type(requirements)
    return RequirementsResponse(
        session_id=session_id,
        functional=functional,
        non_functional=non_functional,
        total=len(functional) + len(non_functional),
    )


def get_classified_requirements(session_id: str, user_id, db: Session) -> ClassifiedRequirementsResponse:
    session = db.query(UserSession).filter(UserSession.id == session_id, UserSession.user_id == user_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    requirements = get_requirements_for_session(session_id, db)
    functional, non_functional = split_by_type(requirements)
    return ClassifiedRequirementsResponse(
        session_id=session_id,
        functional=functional,
        non_functional=non_functional,
        functional_count=len(functional),
        non_functional_count=len(non_functional),
        total=len(functional) + len(non_functional),
    )

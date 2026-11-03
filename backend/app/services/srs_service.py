from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.requirements import Requirement
from app.models.domain import UserSession, Domain
from app.services.ai_service import generate_srs


def generate(session_id: str, project_name: str, project_description: str, db: Session, user_id=None) -> dict:
    q = db.query(UserSession).filter(UserSession.id == session_id)
    if user_id is not None:
        q = q.filter(UserSession.user_id == user_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    domain = db.query(Domain).filter(Domain.id == session.domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    requirements = db.query(Requirement).filter(Requirement.session_id == session_id).all()
    if not requirements:
        raise HTTPException(status_code=404, detail="No requirements found")

    functional = [r for r in requirements if r.type == "functional"]
    non_functional = [r for r in requirements if r.type == "non_functional"]

    content = generate_srs(
        project_name,
        project_description,
        domain.name,
        session.country or "Jordan",
        functional,
        non_functional,
    )
    return {"session_id": session_id, "project_name": project_name, "content": content}

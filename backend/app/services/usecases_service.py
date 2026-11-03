import logging
from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.requirements import Requirement
from app.models.domain import UserSession, Domain
from app.services.ai_service import generate_use_cases
from app.schemas.usecases import UseCasesResponse, UseCaseItem

logger = logging.getLogger("requirements_ai")


def generate(session_id: str, db: Session, user_id=None) -> UseCasesResponse:
    q = db.query(UserSession).filter(UserSession.id == session_id)
    if user_id is not None:
        q = q.filter(UserSession.user_id == user_id)
    session = q.first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    domain = db.query(Domain).filter(Domain.id == session.domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    requirements = db.query(Requirement).filter(
        Requirement.session_id == session_id,
        Requirement.type == "functional",
    ).all()
    if not requirements:
        raise HTTPException(status_code=404, detail="No functional requirements found")

    use_cases_data = generate_use_cases(domain.name, session.country or "Jordan", requirements)
    try:
        use_cases = [UseCaseItem(**uc) for uc in use_cases_data]
    except Exception as e:
        logger.error("Failed to build UseCaseItem list: %s", e)
        raise HTTPException(status_code=502, detail="Use case data from AI was malformed. Please try again.")
    return UseCasesResponse(session_id=session_id, use_cases=use_cases, total=len(use_cases))

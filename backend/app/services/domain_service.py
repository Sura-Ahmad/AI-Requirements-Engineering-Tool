from fastapi import HTTPException
from sqlalchemy.orm import Session
from app.models.domain import Domain, Question, UserSession


def get_domains(country: str, db: Session) -> list:
    domains = db.query(Domain).filter(
        Domain.country == country,
        Domain.is_active == True,
    ).all()
    if not domains:
        raise HTTPException(status_code=404, detail="No domains found for this country")
    return domains


def get_questions(domain_id: str, db: Session) -> list:
    questions = db.query(Question).filter(
        Question.domain_id == domain_id,
        Question.is_active == True,
    ).all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this domain")
    return questions


def create_session(domain_id, country: str, role: str, answers: list, user_id, db: Session):
    if not db.query(Domain).filter(Domain.id == domain_id).first():
        raise HTTPException(status_code=404, detail="Domain not found")

    session = UserSession(
        user_id=user_id,
        domain_id=domain_id,
        country=country,
        role=role,
        answers=[{"question_id": str(a.question_id), "answer": a.answer} for a in answers],
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session

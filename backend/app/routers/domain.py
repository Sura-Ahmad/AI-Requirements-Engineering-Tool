from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.domain import DomainResponse, QuestionResponse, SessionCreate, SessionResponse
from app.services.auth_service import get_current_user
from app.services import domain_service
from typing import List

router = APIRouter(prefix="/domains", tags=["Domains"])


@router.get("/", response_model=List[DomainResponse])
def get_domains(country: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return domain_service.get_domains(country, db)


@router.get("/{domain_id}/questions", response_model=List[QuestionResponse])
def get_questions(domain_id: str, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return domain_service.get_questions(domain_id, db)


@router.post("/session", response_model=SessionResponse, status_code=201)
def create_session(data: SessionCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return domain_service.create_session(
        domain_id=data.domain_id,
        country=data.country,
        role=data.role.value,
        answers=data.answers,
        user_id=current_user.id,
        db=db,
    )

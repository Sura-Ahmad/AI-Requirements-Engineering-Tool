from uuid import UUID
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.requirements import (
    GenerateRequirementsRequest, RequirementsResponse,
    ClassifiedRequirementsResponse, UpdateRequirementRequest, UpdateRequirementResponse,
    AddRequirementRequest, AddRequirementResponse, MessageResponse,
)
from app.core.limiter import limiter
from app.services import requirement_service
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.post("/generate", response_model=RequirementsResponse)
@limiter.limit("10/minute")
def generate(request: Request, data: GenerateRequirementsRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return requirement_service.generate_requirements(str(data.session_id), data.document_text, db, user_id=current_user.id)


@router.get("/{session_id}/classified", response_model=ClassifiedRequirementsResponse)
def get_classified_requirements(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return requirement_service.get_classified_requirements(str(session_id), current_user.id, db)


@router.get("/{session_id}", response_model=RequirementsResponse)
def get_requirements(session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return requirement_service.get_requirements(str(session_id), current_user.id, db)


@router.put("/{requirement_id}", response_model=UpdateRequirementResponse)
@limiter.limit("30/minute")
def update_requirement(request: Request, requirement_id: str, data: UpdateRequirementRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return requirement_service.update_requirement(requirement_id, data.description, db, user_id=current_user.id)


@router.delete("/{requirement_id}", response_model=MessageResponse)
@limiter.limit("30/minute")
def delete_requirement(request: Request, requirement_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return requirement_service.delete_requirement(requirement_id, db, user_id=current_user.id)


@router.post("/add", response_model=AddRequirementResponse)
@limiter.limit("10/minute")
def add_requirement(request: Request, data: AddRequirementRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return requirement_service.add_requirement(data.session_id, data.type, data.description, db, user_id=current_user.id)

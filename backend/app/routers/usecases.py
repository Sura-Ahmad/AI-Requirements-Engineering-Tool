from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.limiter import limiter
from app.schemas.usecases import UseCasesRequest, UseCasesResponse
from app.services import usecases_service
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter(prefix="/usecases", tags=["Use Cases"])


@router.post("/generate", response_model=UseCasesResponse)
@limiter.limit("10/minute")
def generate_use_cases_doc(request: Request, data: UseCasesRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return usecases_service.generate(data.session_id, db, user_id=current_user.id)

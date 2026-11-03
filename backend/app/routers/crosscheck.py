from uuid import UUID
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.crosscheck import CrossCheckResponse
from app.core.limiter import limiter
from app.services import crosscheck_service
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter(prefix="/crosscheck", tags=["Cross-Check"])


@router.get("/{session_id}", response_model=CrossCheckResponse)
@limiter.limit("10/minute")
def cross_check(request: Request, session_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return crosscheck_service.run(str(session_id), db, user_id=current_user.id)

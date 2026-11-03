from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.services.auth_service import get_current_user
from app.services import profile_service
from app.core.limiter import limiter
from app.schemas.profile import ProfileResponse, SessionSummary, SessionDetail, MessageResponse, ProfileUpdate, ChangePasswordRequest

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user=Depends(get_current_user)):
    return profile_service.format_user(current_user)


@router.get("/sessions", response_model=List[SessionSummary])
def get_my_sessions(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return profile_service.get_user_sessions(current_user.id, db)


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session_by_id(session_id: str, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return profile_service.get_session_by_id(session_id, current_user.id, db)


@router.put("/update", response_model=ProfileResponse)
@limiter.limit("10/minute")
def update_profile(request: Request, data: ProfileUpdate, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    return profile_service.update_profile(current_user, data.email, data.full_name, db)


@router.put("/change-password", response_model=MessageResponse)
@limiter.limit("5/minute")
def change_password(request: Request, data: ChangePasswordRequest, current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    profile_service.change_password(current_user, data.current_password, data.new_password, db)
    return {"message": "Password updated successfully"}

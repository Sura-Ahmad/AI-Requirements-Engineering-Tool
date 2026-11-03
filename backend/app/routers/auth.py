from fastapi import APIRouter, Depends, BackgroundTasks, Request, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, RefreshRequest, UserResponse, ForgotPasswordRequest, ResetPasswordRequest
from app.services.auth_service import (
    get_current_user, register_user, resend_verification, verify_email_token,
    login_user, logout_user, initiate_password_reset, complete_password_reset, refresh_tokens,
)
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=201)
@limiter.limit("5/minute")
def register(request: Request, data: RegisterRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    register_user(data.email, data.password, data.full_name, background_tasks, db)
    return {"message": "Registration successful. Please check your email to verify your account."}


@router.post("/resend-verification")
@limiter.limit("3/minute")
def resend_verification_email(request: Request, data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    resend_verification(data.email, background_tasks, db)
    return {"message": "If this email is registered and unverified, a new verification link has been sent."}


@router.get("/verify-email", response_model=TokenResponse)
def verify_email(token: str, db: Session = Depends(get_db)):
    access_token, refresh_token = verify_email_token(token, db)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    access_token, refresh_token = login_user(data.email, data.password, db, request)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/logout")
def logout(data: RefreshRequest, db: Session = Depends(get_db)):
    if not logout_user(data.refresh_token, db):
        raise HTTPException(status_code=400, detail="Token not found or already revoked")
    return {"message": "Logged out successfully"}


@router.post("/forgot-password")
@limiter.limit("3/minute")
def forgot_password(request: Request, data: ForgotPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    initiate_password_reset(data.email, background_tasks, db)
    return {"message": "If this email is registered, you will receive a password reset link."}


@router.post("/reset-password")
@limiter.limit("5/minute")
def reset_password(request: Request, data: ResetPasswordRequest, db: Session = Depends(get_db)):
    complete_password_reset(data.token, data.new_password, db)
    return {"message": "Password reset successfully. You can now log in with your new password."}


@router.get("/me", response_model=UserResponse)
def get_me(current_user=Depends(get_current_user)):
    return current_user


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(request: Request, data: RefreshRequest, db: Session = Depends(get_db)):
    access_token, refresh_token = refresh_tokens(data.refresh_token, db)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)

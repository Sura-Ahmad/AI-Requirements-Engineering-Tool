import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Header, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, verify_token, hash_password, verify_password
from app.models.user import User, RefreshToken, PasswordResetToken, EmailVerificationToken, UserRole
from app.core.config import settings
from app.core.email import send_reset_email, send_verification_email
from app.services.audit_service import log_login

ALLOWED_EMAIL_DOMAINS = {"cit.just.edu.jo", "just.edu.jo", "outlook.com", "yahoo.com", "gmail.com"}


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_tokens(user_id) -> tuple[str, str]:
    access = create_access_token({"sub": str(user_id)})
    refresh = create_refresh_token({"sub": str(user_id)})
    return access, refresh


def store_refresh_token(user_id, refresh_token: str, db: Session) -> None:
    """Persist a refresh token hash. Caller is responsible for db.commit()."""
    db.add(RefreshToken(
        user_id=user_id,
        token_hash=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    ))


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    if not any(c.isalpha() for c in password) or not any(c.isdigit() for c in password):
        raise HTTPException(status_code=400, detail="Password must contain at least 1 letter and 1 number")


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id_str).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    return user


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Auth flows 

def register_user(email: str, password: str, full_name: str, background_tasks: BackgroundTasks, db: Session) -> None:
    email_domain = email.split("@")[-1].lower()
    if email_domain not in ALLOWED_EMAIL_DOMAINS:
        raise HTTPException(status_code=400, detail="Registration is only allowed for authorized email domains")
    validate_password_strength(password)
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(email=email, password_hash=hash_password(password), full_name=full_name)
    db.add(user)
    db.flush()
    token = secrets.token_urlsafe(32)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24),
    ))
    db.commit()
    verify_link = f"{settings.FRONTEND_URL}/auth/verify-email?token={token}"
    background_tasks.add_task(send_verification_email, user.email, user.full_name, verify_link)


def resend_verification(email: str, background_tasks: BackgroundTasks, db: Session) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user or user.is_verified:
        return  
    db.query(EmailVerificationToken).filter(
        EmailVerificationToken.user_id == user.id,
        EmailVerificationToken.is_used == False,
    ).update({"is_used": True})
    db.flush()
    token = secrets.token_urlsafe(32)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=24),
    ))
    db.commit()
    verify_link = f"{settings.FRONTEND_URL}/auth/verify-email?token={token}"
    background_tasks.add_task(send_verification_email, user.email, user.full_name, verify_link)


def verify_email_token(token: str, db: Session) -> tuple:
    verification = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == hash_token(token),
        EmailVerificationToken.is_used == False,
        EmailVerificationToken.expires_at > datetime.now(timezone.utc).replace(tzinfo=None),
    ).first()
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification link. Please register again.")
    user = db.query(User).filter(User.id == verification.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    user.is_verified = True
    verification.is_used = True
    db.flush()
    access_token, refresh_token = create_tokens(user.id)
    store_refresh_token(user.id, refresh_token, db)
    db.commit()
    return access_token, refresh_token


def login_user(email: str, password: str, db: Session, request) -> tuple:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        log_login(db, email=email, success=False, request=request, failure_reason="user_not_found")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(password, user.password_hash):
        log_login(db, email=email, success=False, user_id=user.id, request=request, failure_reason="wrong_password")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        log_login(db, email=email, success=False, user_id=user.id, request=request, failure_reason="account_disabled")
        raise HTTPException(status_code=401, detail="Account is disabled")
    if not user.is_verified:
        log_login(db, email=email, success=False, user_id=user.id, request=request, failure_reason="email_not_verified")
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")
    log_login(db, email=email, success=True, user_id=user.id, request=request)
    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    access_token, refresh_token = create_tokens(user.id)
    store_refresh_token(user.id, refresh_token, db)
    db.commit()
    return access_token, refresh_token


def logout_user(refresh_token: str, db: Session) -> bool:
    db_token = db.query(RefreshToken).filter(RefreshToken.token_hash == hash_token(refresh_token)).first()
    if not db_token:
        return False
    db_token.is_revoked = True
    db.commit()
    return True


def initiate_password_reset(email: str, background_tasks: BackgroundTasks, db: Session) -> None:
    user = db.query(User).filter(User.email == email).first()
    if user and user.is_active:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False,
        ).update({"is_used": True})
        db.flush()
        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(hours=1),
        ))
        db.commit()
        reset_link = f"{settings.FRONTEND_URL}/auth/reset-password?token={token}"
        background_tasks.add_task(send_reset_email, user.email, user.full_name, reset_link)


def complete_password_reset(token: str, new_password: str, db: Session) -> None:
    validate_password_strength(new_password)
    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == hash_token(token),
        PasswordResetToken.is_used == False,
        PasswordResetToken.expires_at > datetime.now(timezone.utc).replace(tzinfo=None),
    ).first()
    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link. Please request a new one.")
    user = db.query(User).filter(User.id == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    user.password_hash = hash_password(new_password)
    reset_token.is_used = True
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.is_revoked == False).update({"is_revoked": True})
    db.commit()


def refresh_tokens(refresh_token: str, db: Session) -> tuple:
    payload = verify_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token_hash == hash_token(refresh_token),
        RefreshToken.is_revoked == False,
    ).first()
    if not db_token:
        raise HTTPException(status_code=401, detail="Token revoked or not found")
    db_token.is_revoked = True
    new_access_token, new_refresh_token = create_tokens(db_token.user_id)
    store_refresh_token(db_token.user_id, new_refresh_token, db)
    db.commit()
    return new_access_token, new_refresh_token

from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User, RefreshToken
from app.models.domain import UserSession, Domain
from app.models.requirements import Requirement
from app.core.security import hash_password, verify_password
from app.services.auth_service import validate_password_strength


def format_user(user: User) -> dict:
    return {
        "id": str(user.id),
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role.value,
        "created_at": (user.created_at.isoformat() + "Z") if user.created_at else None,
        "last_login": (user.last_login.isoformat() + "Z") if user.last_login else None,
    }


def get_user_sessions(user_id, db: Session) -> list:
    sessions = (
        db.query(UserSession)
        .filter(UserSession.user_id == user_id)
        .order_by(UserSession.created_at.desc())
        .all()
    )
    domain_ids = [s.domain_id for s in sessions]
    session_ids = [s.id for s in sessions]

    domains_map = {d.id: d for d in db.query(Domain).filter(Domain.id.in_(domain_ids)).all()}
    req_counts = dict(
        db.query(Requirement.session_id, func.count(Requirement.id))
        .filter(Requirement.session_id.in_(session_ids))
        .group_by(Requirement.session_id)
        .all()
    )

    return [
        {
            "session_id": str(s.id),
            "domain_name": domains_map[s.domain_id].name if s.domain_id in domains_map else "Unknown",
            "country": s.country,
            "role": s.role,
            "created_at": (s.created_at.isoformat() + "Z") if s.created_at else None,
            "requirements_count": req_counts.get(s.id, 0),
        }
        for s in sessions
    ]


def get_session_by_id(session_id: str, user_id, db: Session) -> dict:
    session = (
        db.query(UserSession)
        .filter(UserSession.id == session_id, UserSession.user_id == user_id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    domain = db.query(Domain).filter(Domain.id == session.domain_id).first()
    return {
        "session_id": str(session.id),
        "domain_name": domain.name if domain else "Unknown",
        "country": session.country,
        "role": session.role,
        "created_at": session.created_at.isoformat() if session.created_at else None,
    }


def update_profile(user: User, email: Optional[str], full_name: Optional[str], db: Session) -> dict:
    if email is not None:
        normalized = email.strip().lower()
        if normalized != user.email:
            if db.query(User).filter(User.email == normalized, User.id != user.id).first():
                raise HTTPException(status_code=400, detail="Email is already in use")
            user.email = normalized
    if full_name is not None:
        user.full_name = full_name.strip()
    db.commit()
    db.refresh(user)
    return format_user(user)


def change_password(user: User, current_password: str, new_password: str, db: Session) -> None:
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    validate_password_strength(new_password)
    user.password_hash = hash_password(new_password)
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id, RefreshToken.is_revoked == False).update({"is_revoked": True})
    db.commit()

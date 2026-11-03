from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user import User
from app.models.domain import Domain, Question, UserSession
from app.models.requirements import Requirement
from app.services.audit_service import log_action


# Statistics

def get_dashboard_stats(db: Session) -> dict:
    return {
        "total_users": db.query(func.count(User.id)).scalar(),
        "total_sessions": db.query(func.count(UserSession.id)).scalar(),
        "total_requirements": db.query(func.count(Requirement.id)).scalar(),
        "active_users_count": db.query(func.count(User.id)).filter(User.is_active == True).scalar(),
    }


# Users 

def get_all_users_with_session_counts(db: Session) -> list:
    session_counts = dict(
        db.query(UserSession.user_id, func.count(UserSession.id))
        .group_by(UserSession.user_id)
        .all()
    )
    users = db.query(User).order_by(User.created_at.desc()).limit(500).all()
    return [
        {
            "id": str(user.id),
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
            "created_at": (user.created_at.isoformat() + "Z") if user.created_at else None,
            "last_login": (user.last_login.isoformat() + "Z") if user.last_login else None,
            "sessions_count": session_counts.get(user.id, 0),
        }
        for user in users
    ]


def toggle_user_active(user_id: str, admin_id, db: Session, request) -> dict:
    if str(admin_id) == user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    db.commit()
    log_action(
        db, admin_id,
        action="activate_user" if user.is_active else "deactivate_user",
        entity_type="user",
        entity_id=user_id,
        details={"email": user.email, "is_active": user.is_active},
        request=request,
    )
    return {"id": str(user.id), "is_active": user.is_active}


# ── Sessions 

def get_all_sessions_with_details(db: Session) -> list:
    sessions = db.query(UserSession).order_by(UserSession.created_at.desc()).limit(500).all()
    user_ids = [s.user_id for s in sessions]
    domain_ids = [s.domain_id for s in sessions]
    session_ids = [s.id for s in sessions]

    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}
    domains_map = {d.id: d for d in db.query(Domain).filter(Domain.id.in_(domain_ids)).all()}
    req_counts = dict(
        db.query(Requirement.session_id, func.count(Requirement.id))
        .filter(Requirement.session_id.in_(session_ids))
        .group_by(Requirement.session_id)
        .all()
    )

    result = []
    for s in sessions:
        user = users_map.get(s.user_id)
        domain = domains_map.get(s.domain_id)
        result.append({
            "id": str(s.id),
            "user_name": user.full_name if user else "Unknown",
            "user_email": user.email if user else "Unknown",
            "domain_name": domain.name if domain else "Unknown",
            "country": s.country,
            "role": s.role,
            "created_at": (s.created_at.isoformat() + "Z") if s.created_at else None,
            "requirements_count": req_counts.get(s.id, 0),
        })
    return result


# ── Domains 

def get_all_domains_with_session_counts(db: Session) -> list:
    session_counts = dict(
        db.query(UserSession.domain_id, func.count(UserSession.id))
        .group_by(UserSession.domain_id)
        .all()
    )
    domains = db.query(Domain).order_by(Domain.created_at.desc()).limit(500).all()
    return [
        {
            "id": str(d.id),
            "name": d.name,
            "name_ar": d.name_ar,
            "country": d.country,
            "is_active": d.is_active,
            "created_at": (d.created_at.isoformat() + "Z") if d.created_at else None,
            "sessions_count": session_counts.get(d.id, 0),
        }
        for d in domains
    ]


def create_domain(name: str, name_ar: str, country: str, admin_id, db: Session, request) -> dict:
    existing = db.query(Domain).filter(Domain.name == name, Domain.country == country).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Domain '{name}' already exists for country '{country}'.")
    domain = Domain(name=name, name_ar=name_ar, country=country)
    db.add(domain)
    db.commit()
    db.refresh(domain)
    log_action(
        db, admin_id,
        action="create_domain",
        entity_type="domain",
        entity_id=str(domain.id),
        details={"name": name, "name_ar": name_ar, "country": country},
        request=request,
    )
    return {
        "id": str(domain.id),
        "name": domain.name,
        "name_ar": domain.name_ar,
        "country": domain.country,
        "is_active": domain.is_active,
    }


def update_domain(domain_id: str, data, admin_id, db: Session, request) -> dict:
    domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    changes = {}
    if data.name is not None:
        changes["name"] = {"old": domain.name, "new": data.name}
        domain.name = data.name
    if data.name_ar is not None:
        changes["name_ar"] = {"old": domain.name_ar, "new": data.name_ar}
        domain.name_ar = data.name_ar
    if data.country is not None:
        changes["country"] = {"old": domain.country, "new": data.country}
        domain.country = data.country
    if data.is_active is not None:
        changes["is_active"] = {"old": domain.is_active, "new": data.is_active}
        domain.is_active = data.is_active
    db.commit()
    log_action(
        db, admin_id,
        action="update_domain",
        entity_type="domain",
        entity_id=domain_id,
        details=changes,
        request=request,
    )
    return {
        "id": str(domain.id),
        "name": domain.name,
        "name_ar": domain.name_ar,
        "country": domain.country,
        "is_active": domain.is_active,
    }


def delete_domain(domain_id: str, admin_id, db: Session, request) -> dict:
    domain = db.query(Domain).filter(Domain.id == domain_id).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    if db.query(UserSession).filter(UserSession.domain_id == domain_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete domain with existing sessions")
    db.query(Question).filter(Question.domain_id == domain_id).delete()
    db.delete(domain)
    db.commit()
    log_action(
        db, admin_id,
        action="delete_domain",
        entity_type="domain",
        entity_id=domain_id,
        details={"name": domain.name},
        request=request,
    )
    return {"message": "Domain deleted"}


#  Documents 

def get_sessions_with_documents(db: Session) -> list:
    sessions = (
        db.query(UserSession)
        .filter(UserSession.document_text.isnot(None))
        .order_by(UserSession.created_at.desc())
        .all()
    )
    user_ids = [s.user_id for s in sessions]
    domain_ids = [s.domain_id for s in sessions]
    users_map = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}
    domains_map = {d.id: d for d in db.query(Domain).filter(Domain.id.in_(domain_ids)).all()}
    return [
        {
            "session_id": str(s.id),
            "user_name": users_map[s.user_id].full_name if s.user_id in users_map else "Unknown",
            "user_email": users_map[s.user_id].email if s.user_id in users_map else "Unknown",
            "domain": domains_map[s.domain_id].name if s.domain_id in domains_map else "Unknown",
            "country": s.country,
            "created_at": (s.created_at.isoformat() + "Z") if s.created_at else None,
            "preview": (s.document_text[:200] + "...") if s.document_text and len(s.document_text) > 200 else (s.document_text or ""),
        }
        for s in sessions
    ]


def get_document_text(session_id: str, db: Session) -> dict:
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not session or not session.document_text:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"document_text": session.document_text, "session_id": session_id}


# Questions 

def get_questions_for_domain(domain_id: str, db: Session) -> list:
    questions = db.query(Question).filter(Question.domain_id == domain_id).all()
    return [
        {
            "id": str(q.id),
            "domain_id": str(q.domain_id),
            "question_text": q.question_text,
            "is_active": q.is_active,
        }
        for q in questions
    ]


def create_question(domain_id: str, question_text: str, admin_id, db: Session, request) -> dict:
    question = Question(domain_id=domain_id, question_text=question_text)
    db.add(question)
    db.commit()
    db.refresh(question)
    log_action(
        db, admin_id,
        action="create_question",
        entity_type="question",
        entity_id=str(question.id),
        details={"domain_id": domain_id, "question_text": question_text},
        request=request,
    )
    return {
        "id": str(question.id),
        "domain_id": str(question.domain_id),
        "question_text": question.question_text,
        "is_active": question.is_active,
    }


def update_question(question_id: str, data, admin_id, db: Session, request) -> dict:
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    changes = {}
    if data.question_text is not None:
        changes["question_text"] = {"old": question.question_text, "new": data.question_text}
        question.question_text = data.question_text
    if data.is_active is not None:
        changes["is_active"] = {"old": question.is_active, "new": data.is_active}
        question.is_active = data.is_active
    db.commit()
    log_action(
        db, admin_id,
        action="update_question",
        entity_type="question",
        entity_id=question_id,
        details=changes,
        request=request,
    )
    return {
        "id": str(question.id),
        "domain_id": str(question.domain_id),
        "question_text": question.question_text,
        "is_active": question.is_active,
    }


def delete_question(question_id: str, admin_id, db: Session, request) -> dict:
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    db.delete(question)
    db.commit()
    log_action(
        db, admin_id,
        action="delete_question",
        entity_type="question",
        entity_id=question_id,
        details={"question_text": question.question_text},
        request=request,
    )
    return {"message": "Question deleted"}

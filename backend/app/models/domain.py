from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.core.database import Base
import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum


class ProjectRole(str, PyEnum):
    PO = "product_owner"
    BA = "business_analyst"
    DEVELOPER = "developer"
    STAKEHOLDER = "stakeholder"


class Domain(Base):
    __tablename__ = "domains"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    name_ar = Column(String(100), nullable=False)
    country = Column(String(10), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    questions = relationship("Question", back_populates="domain")
    sessions = relationship("UserSession", back_populates="domain")


class Question(Base):
    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    domain_id = Column(UUID(as_uuid=True), ForeignKey("domains.id"), nullable=False, index=True)
    question_text = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True)

    domain = relationship("Domain", back_populates="questions")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    domain_id = Column(UUID(as_uuid=True), ForeignKey("domains.id"), nullable=False, index=True)
    country = Column(String(10), nullable=False)
    role = Column(String(50), nullable=False, default="business_analyst")
    answers = Column(JSONB, nullable=True)
    document_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    user = relationship("User", back_populates="sessions")
    domain = relationship("Domain", back_populates="sessions")
    requirements = relationship("Requirement", back_populates="session")

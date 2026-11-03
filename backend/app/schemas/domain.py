from pydantic import BaseModel, ConfigDict
from uuid import UUID
from typing import List
from app.models.domain import ProjectRole

class DomainResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    name: str
    name_ar: str
    country: str

class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    domain_id: UUID
    question_text: str

class AnswerItem(BaseModel):
    question_id: UUID
    answer: str

class SessionCreate(BaseModel):
    domain_id: UUID
    country: str
    role: ProjectRole
    answers: List[AnswerItem]

class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    domain_id: UUID
    country: str
    role: str
from pydantic import BaseModel
from typing import Optional


class DomainCreate(BaseModel):
    name: str
    name_ar: str = ""
    country: str


class DomainUpdate(BaseModel):
    name: Optional[str] = None
    name_ar: Optional[str] = None
    country: Optional[str] = None
    is_active: Optional[bool] = None


class QuestionCreate(BaseModel):
    question_text: str


class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    is_active: Optional[bool] = None

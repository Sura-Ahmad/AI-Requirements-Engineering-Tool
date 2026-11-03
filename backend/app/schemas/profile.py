from pydantic import BaseModel
from typing import Optional


class ProfileResponse(BaseModel):
    id: str
    full_name: str
    email: str
    role: str
    created_at: Optional[str] = None
    last_login: Optional[str] = None


class SessionSummary(BaseModel):
    session_id: str
    domain_name: str
    country: str
    role: str
    created_at: Optional[str] = None
    requirements_count: int


class SessionDetail(BaseModel):
    session_id: str
    domain_name: str
    country: str
    role: str
    created_at: Optional[str] = None


class MessageResponse(BaseModel):
    message: str


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

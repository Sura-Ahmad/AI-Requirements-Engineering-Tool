from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class SRSRequest(BaseModel):
    session_id: UUID
    project_name: str
    project_description: Optional[str] = ""

class SRSResponse(BaseModel):
    session_id: UUID
    project_name: str
    content: str
    format: str = "IEEE"
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID

class IssueItem(BaseModel):
    requirement_id: UUID
    code: str
    description: str
    issue_type: str
    issue_detail: str
    highlight_color: str
    conflict_with: str = ""

class CrossCheckResponse(BaseModel):
    session_id: UUID
    issues: List[IssueItem]
    ambiguities_count: int
    duplicates_count: int
    inconsistencies_count: int
    total_issues: int
from pydantic import BaseModel
from typing import List, Optional
from uuid import UUID


class UseCaseItem(BaseModel):
    model_config = {"extra": "ignore"}

    use_case_id: Optional[str] = ""
    title: Optional[str] = ""
    actor: Optional[str] = ""
    trigger: Optional[str] = ""
    preconditions: Optional[str] = ""
    main_flow: Optional[str] = ""
    alternative_flows: Optional[str] = ""
    exception_flows: Optional[str] = ""
    postconditions: Optional[str] = ""
    priority: Optional[str] = ""
    related_requirements: Optional[str] = ""


class UseCasesRequest(BaseModel):
    session_id: UUID


class UseCasesResponse(BaseModel):
    session_id: UUID
    use_cases: List[UseCaseItem]
    total: int

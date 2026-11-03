from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.limiter import limiter
from app.schemas.srs import SRSRequest, SRSResponse
from app.services import srs_service
from app.services.auth_service import get_current_user
from app.models.user import User

router = APIRouter(prefix="/srs", tags=["SRS"])


@router.post("/generate", response_model=SRSResponse)
@limiter.limit("5/minute")
def generate_srs_doc(request: Request, data: SRSRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = srs_service.generate(data.session_id, data.project_name, data.project_description, db, user_id=current_user.id)
    return SRSResponse(**result, format="IEEE")

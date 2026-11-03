from fastapi import APIRouter, UploadFile, File, Depends, Request
from app.schemas.upload import TextInput, ProcessedInput
from app.services.auth_service import get_current_user
from app.services import file_service
from app.core.limiter import limiter

router = APIRouter(prefix="/input", tags=["Input"])


@router.post("/text", response_model=ProcessedInput)
@limiter.limit("20/minute")
def process_text(request: Request, data: TextInput, current_user=Depends(get_current_user)):
    return file_service.process_text_input(data.text)


@router.post("/document", response_model=ProcessedInput)
@limiter.limit("5/minute")
async def process_document(request: Request, file: UploadFile = File(...), current_user=Depends(get_current_user)):
    return await file_service.process_document_input(file)

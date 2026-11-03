from pydantic import BaseModel
from typing import Optional

class TextInput(BaseModel):
    text: str
    session_id: str = ""

class ProcessedInput(BaseModel):
    original_length: int
    processed_text: str
    pii_detected: bool
    input_type: str
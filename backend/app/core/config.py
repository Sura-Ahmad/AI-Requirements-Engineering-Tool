from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")
    
    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_DAYS: int
    QDRANT_URL: str
    QDRANT_API_KEY: str
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    #SMTP_HOST: str = "smtp.gmail.com"
    #SMTP_PORT: int = 587
    #SMTP_USER: str = ""
    #SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    BREVO_API_KEY: str = ""
    FRONTEND_URL: str
    CLAUDE_MODEL: str = "claude-sonnet-4-6"
    KNOWLEDGE_BASE_PATH: str = "Knowledge_base"
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

settings = Settings()
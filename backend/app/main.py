import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.routers import auth, domain, upload, requirements, crosscheck, srs, usecases, admin, profile
from app.core.config import settings
from app.core.limiter import limiter
from app.core.knowledge_base import ensure_collection

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        ensure_collection()
    except Exception as e:
        logger.warning("Qdrant init failed at startup: %s", e)
    yield


app = FastAPI(title="Requirements AI", version="1.0.0", lifespan=lifespan)

# Rate limiting (needed by auth, requirements, crosscheck, srs, usecases routes)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Allow the frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register all routes
app.include_router(auth.router)
app.include_router(domain.router)
app.include_router(upload.router)
app.include_router(requirements.router)
app.include_router(crosscheck.router)
app.include_router(srs.router)
app.include_router(usecases.router)
app.include_router(admin.router)
app.include_router(profile.router)


@app.get("/health")
def health():
    return {"status": "ok"}

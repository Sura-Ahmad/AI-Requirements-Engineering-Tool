import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.config import settings
from app.core.security import hash_password
from app.core.limiter import limiter
from app.models.user import User

TEST_ENGINE = create_engine(settings.TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=TEST_ENGINE)
    yield
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(autouse=True)
def reset_limiter():
    limiter._storage.reset()
    yield


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def user(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def suraaldamen(db):
    u = User(
        email=f"sura_{uuid.uuid4().hex[:6]}@gmail.com",
        password_hash=hash_password("test1234"),
        full_name="Sura Aldamen",
        is_verified=True,
        is_active=True,
    )
    db.add(u)
    db.commit()
    db.refresh(u)
    yield u
    db.query(User).filter(User.id == u.id).delete()
    db.commit()

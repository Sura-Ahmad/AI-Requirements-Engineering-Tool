from sqlalchemy import create_engine #tool for creating connection
from sqlalchemy.ext.declarative import declarative_base #tool for transform python class into db tables
from sqlalchemy.orm import sessionmaker
from app.core.config import settings #for using setting.DATABASE_URL from .env

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True, #before using a connection, check it's still alive.
    pool_size=10, #keep 10 connections open and ready at all times
    max_overflow=20, #if all 10 are busy, allow up to 20 extra temporary connections before refusing new requests
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
#for creating Database-session (query,add,commit,close..etc)
#autocommit=false (manual commiting so if an error occured partial data will not be saved)
#autoflush=false (don't send pending changes to the database automatically)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#yield is better than return as return only passes the connection but yield means after finish using the session return to close it

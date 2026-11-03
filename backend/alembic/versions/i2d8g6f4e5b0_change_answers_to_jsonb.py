"""change user_sessions.answers from Text to JSONB

Revision ID: i2d8g6f4e5b0
Revises: h1c7f5e3d2a9
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'i2d8g6f4e5b0'
down_revision: Union[str, Sequence[str], None] = 'h1c7f5e3d2a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'user_sessions',
        'answers',
        existing_type=sa.Text(),
        type_=JSONB(),
        existing_nullable=True,
        postgresql_using='answers::jsonb',
    )


def downgrade() -> None:
    op.alter_column(
        'user_sessions',
        'answers',
        existing_type=JSONB(),
        type_=sa.Text(),
        existing_nullable=True,
        postgresql_using='answers::text',
    )

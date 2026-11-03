"""add document_text to user_sessions

Revision ID: k4f0i8h6g5d2
Revises: j3e9h7g5f6c1
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'k4f0i8h6g5d2'
down_revision: Union[str, Sequence[str], None] = 'j3e9h7g5f6c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('user_sessions', sa.Column('document_text', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('user_sessions', 'document_text')

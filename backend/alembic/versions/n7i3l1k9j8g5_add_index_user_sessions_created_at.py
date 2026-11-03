"""add index on user_sessions.created_at

Revision ID: n7i3l1k9j8g5
Revises: m6h2k0j8i7f4
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'n7i3l1k9j8g5'
down_revision: Union[str, None] = 'm6h2k0j8i7f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_user_sessions_created_at', 'user_sessions', ['created_at'])


def downgrade() -> None:
    op.drop_index('ix_user_sessions_created_at', table_name='user_sessions')

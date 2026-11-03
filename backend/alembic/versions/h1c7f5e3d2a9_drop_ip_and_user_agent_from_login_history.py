"""drop ip_address and user_agent from login_history

Revision ID: h1c7f5e3d2a9
Revises: g8b6e4c2d1f3
Create Date: 2026-05-24 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'h1c7f5e3d2a9'
down_revision: Union[str, Sequence[str], None] = 'g8b6e4c2d1f3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('login_history', 'ip_address')
    op.drop_column('login_history', 'user_agent')


def downgrade() -> None:
    op.add_column('login_history', sa.Column('user_agent', sa.String(500), nullable=True))
    op.add_column('login_history', sa.Column('ip_address', sa.String(45), nullable=True))

"""add avatar_url to users

Revision ID: d5e3f2a1b6c8
Revises: c4d2e3f1a8b9
Create Date: 2026-04-29 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5e3f2a1b6c8'
down_revision: Union[str, Sequence[str], None] = 'c4d2e3f1a8b9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'avatar_url')

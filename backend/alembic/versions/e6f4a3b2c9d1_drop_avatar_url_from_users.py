"""drop avatar_url from users

Revision ID: e6f4a3b2c9d1
Revises: d5e3f2a1b6c8
Create Date: 2026-05-01 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e6f4a3b2c9d1'
down_revision: Union[str, Sequence[str], None] = 'd5e3f2a1b6c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('users', 'avatar_url')


def downgrade() -> None:
    op.add_column('users', sa.Column('avatar_url', sa.String(500), nullable=True))

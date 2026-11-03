"""add requirements table

Revision ID: a9d0817cac7b
Revises: 569fded45c94
Create Date: 2026-04-05 12:55:46.810012

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'a9d0817cac7b'
down_revision: Union[str, Sequence[str], None] = '569fded45c94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'requirements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('session_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('user_sessions.id'), nullable=False),
        sa.Column('code', sa.String(20), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('is_edited', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_requirements_session_id', 'requirements', ['session_id'])


def downgrade() -> None:
    op.drop_index('ix_requirements_session_id', table_name='requirements')
    op.drop_table('requirements')

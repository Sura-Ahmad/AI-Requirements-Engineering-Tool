"""add requirement_history table

Revision ID: f7a5d3b8e2c4
Revises: e6f4a3b2c9d1
Create Date: 2026-05-01 00:01:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'f7a5d3b8e2c4'
down_revision: Union[str, Sequence[str], None] = 'e6f4a3b2c9d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'requirement_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('requirement_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('requirements.id'), nullable=False),
        sa.Column('old_description', sa.Text, nullable=False),
        sa.Column('changed_at', sa.DateTime, nullable=False,
                  server_default=sa.func.now()),
    )
    op.create_index('ix_req_history_requirement_id', 'requirement_history', ['requirement_id'])


def downgrade() -> None:
    op.drop_index('ix_req_history_requirement_id', table_name='requirement_history')
    op.drop_table('requirement_history')

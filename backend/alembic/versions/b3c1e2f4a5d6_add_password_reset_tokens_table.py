"""add password reset tokens table

Revision ID: b3c1e2f4a5d6
Revises: a9d0817cac7b
Create Date: 2026-04-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'b3c1e2f4a5d6'
down_revision: Union[str, Sequence[str], None] = 'a9d0817cac7b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=False),
        sa.Column('token_hash', sa.String(255), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_password_reset_tokens_token_hash', 'password_reset_tokens', ['token_hash'])
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_password_reset_tokens_user_id', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_token_hash', table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')

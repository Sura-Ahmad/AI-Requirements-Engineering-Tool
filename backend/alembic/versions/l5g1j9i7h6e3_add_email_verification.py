"""add email verification

Revision ID: l5g1j9i7h6e3
Revises: k4f0i8h6g5d2
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = 'l5g1j9i7h6e3'
down_revision: Union[str, None] = 'k4f0i8h6g5d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('is_verified', sa.Boolean(), server_default='false', nullable=False))
    op.create_table(
        'email_verification_tokens',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('token_hash', sa.String(255), unique=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('is_used', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_email_verification_tokens_user_id', 'email_verification_tokens', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_email_verification_tokens_user_id', table_name='email_verification_tokens')
    op.drop_table('email_verification_tokens')
    op.drop_column('users', 'is_verified')

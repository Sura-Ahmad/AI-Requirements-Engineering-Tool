"""add audit_logs and login_history tables

Revision ID: c4d2e3f1a8b9
Revises: b3c1e2f4a5d6
Create Date: 2026-04-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSON


revision: str = 'c4d2e3f1a8b9'
down_revision: Union[str, Sequence[str], None] = 'b3c1e2f4a5d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('action', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),
        sa.Column('entity_id', sa.String(255), nullable=True),
        sa.Column('details', JSON, nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_audit_logs_user_id', 'audit_logs', ['user_id'])
    op.create_index('ix_audit_logs_created_at', 'audit_logs', ['created_at'])
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'])

    op.create_table(
        'login_history',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), nullable=True),
        sa.Column('email_attempted', sa.String(255), nullable=False),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('failure_reason', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_login_history_email', 'login_history', ['email_attempted'])
    op.create_index('ix_login_history_created_at', 'login_history', ['created_at'])
    op.create_index('ix_login_history_user_id', 'login_history', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_login_history_user_id', table_name='login_history')
    op.drop_index('ix_login_history_created_at', table_name='login_history')
    op.drop_index('ix_login_history_email', table_name='login_history')
    op.drop_table('login_history')

    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_created_at', table_name='audit_logs')
    op.drop_index('ix_audit_logs_user_id', table_name='audit_logs')
    op.drop_table('audit_logs')

"""add missing indexes on FK columns

Revision ID: j3e9h7g5f6c1
Revises: i2d8g6f4e5b0
Create Date: 2026-05-25 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'j3e9h7g5f6c1'
down_revision: Union[str, Sequence[str], None] = 'i2d8g6f4e5b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index('ix_requirements_session_id', 'requirements', ['session_id'], if_not_exists=True)
    op.create_index('ix_requirement_history_requirement_id', 'requirement_history', ['requirement_id'], if_not_exists=True)
    op.create_index('ix_questions_domain_id', 'questions', ['domain_id'], if_not_exists=True)
    op.create_index('ix_user_sessions_user_id', 'user_sessions', ['user_id'], if_not_exists=True)
    op.create_index('ix_user_sessions_domain_id', 'user_sessions', ['domain_id'], if_not_exists=True)
    op.create_index('ix_refresh_tokens_expires_at', 'refresh_tokens', ['expires_at'], if_not_exists=True)


def downgrade() -> None:
    op.drop_index('ix_requirements_session_id', table_name='requirements')
    op.drop_index('ix_requirement_history_requirement_id', table_name='requirement_history')
    op.drop_index('ix_questions_domain_id', table_name='questions')
    op.drop_index('ix_user_sessions_user_id', table_name='user_sessions')
    op.drop_index('ix_user_sessions_domain_id', table_name='user_sessions')
    op.drop_index('ix_refresh_tokens_expires_at', table_name='refresh_tokens')

"""drop question_text_ar and question_order from questions

Revision ID: g8b6e4c2d1f3
Revises: f7a5d3b8e2c4
Create Date: 2026-05-19 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'g8b6e4c2d1f3'
down_revision: Union[str, Sequence[str], None] = 'f7a5d3b8e2c4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('questions', 'question_text_ar')
    op.drop_column('questions', 'question_order')


def downgrade() -> None:
    op.add_column('questions', sa.Column('question_order', sa.String(length=10), nullable=True))
    op.add_column('questions', sa.Column('question_text_ar', sa.Text(), nullable=True))

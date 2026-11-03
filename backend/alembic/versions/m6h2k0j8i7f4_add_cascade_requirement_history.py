"""add cascade to requirement_history fk

Revision ID: m6h2k0j8i7f4
Revises: l5g1j9i7h6e3
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op

revision: str = 'm6h2k0j8i7f4'
down_revision: Union[str, None] = 'l5g1j9i7h6e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint('requirement_history_requirement_id_fkey', 'requirement_history', type_='foreignkey')
    op.create_foreign_key(
        'requirement_history_requirement_id_fkey',
        'requirement_history', 'requirements',
        ['requirement_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('requirement_history_requirement_id_fkey', 'requirement_history', type_='foreignkey')
    op.create_foreign_key(
        'requirement_history_requirement_id_fkey',
        'requirement_history', 'requirements',
        ['requirement_id'], ['id'],
    )

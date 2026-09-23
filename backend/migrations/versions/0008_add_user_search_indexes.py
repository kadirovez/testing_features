"""add prefix search indexes on users

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-23
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE INDEX ix_users_username_lower_pattern ON users (lower(username) text_pattern_ops)")
    op.execute("CREATE INDEX ix_users_display_name_lower_pattern ON users (lower(display_name) text_pattern_ops)")


def downgrade() -> None:
    op.drop_index("ix_users_display_name_lower_pattern", table_name="users")
    op.drop_index("ix_users_username_lower_pattern", table_name="users")

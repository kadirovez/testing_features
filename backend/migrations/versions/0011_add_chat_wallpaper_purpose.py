"""add chat_wallpaper media purpose

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-24
"""
from collections.abc import Sequence

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # `media_purpose` is a VARCHAR + CHECK (native_enum=False), not a PostgreSQL ENUM.
    op.execute("ALTER TABLE media_files DROP CONSTRAINT ck_media_files_media_purpose")
    op.execute(
        "ALTER TABLE media_files ADD CONSTRAINT ck_media_files_media_purpose "
        "CHECK (purpose IN ('avatar', 'chat_avatar', 'chat_wallpaper', 'message'))"
    )


def downgrade() -> None:
    op.execute("ALTER TABLE media_files DROP CONSTRAINT ck_media_files_media_purpose")
    op.execute(
        "ALTER TABLE media_files ADD CONSTRAINT ck_media_files_media_purpose "
        "CHECK (purpose IN ('avatar', 'chat_avatar', 'message'))"
    )

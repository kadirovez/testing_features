"""create user settings

Revision ID: 0004
Revises: 0003
Create Date: 2026-09-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("notifications_enabled", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("notification_preview", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("read_receipts_visible", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column(
            "online_status_visibility",
            sa.Enum(
                "everyone",
                "contacts",
                "nobody",
                name="online_status_visibility",
                native_enum=False,
                create_constraint=True,
                length=32,
            ),
            server_default="everyone",
            nullable=False,
        ),
        sa.Column("language", sa.String(8), server_default="en", nullable=False),
        sa.Column("theme", postgresql.JSONB(), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id"),
    )


def downgrade() -> None:
    op.drop_table("user_settings")

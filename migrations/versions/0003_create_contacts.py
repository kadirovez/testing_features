"""create contacts

Revision ID: 0003
Revises: 0002
Create Date: 2026-09-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "contacts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("contact_user_id", sa.Uuid(), nullable=False),
        sa.Column("alias", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("owner_id <> contact_user_id", name="not_self"),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["contact_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_id", "contact_user_id"),
    )
    op.create_index("ix_contacts_contact_user_id", "contacts", ["contact_user_id"])


def downgrade() -> None:
    op.drop_index("ix_contacts_contact_user_id", table_name="contacts")
    op.drop_table("contacts")

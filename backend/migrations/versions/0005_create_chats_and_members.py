"""create chats and chat members

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _enum(name: str, *values: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, create_constraint=True, length=32)


def upgrade() -> None:
    op.create_table(
        "chats",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("type", _enum("chat_type", "direct", "group"), nullable=False),
        sa.Column("title", sa.String(128), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        # FK to media_files is added in 0007 together with the media table.
        sa.Column("avatar_media_id", sa.Uuid(), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.Column("direct_key", sa.String(80), nullable=True),
        sa.Column("last_message_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("direct_key"),
    )
    op.create_index("ix_chats_last_message_at_id", "chats", [sa.text("last_message_at DESC"), sa.text("id DESC")])

    op.create_table(
        "chat_members",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("chat_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", _enum("chat_role", "owner", "admin", "member"), nullable=False),
        sa.Column("muted_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("joined_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["chat_id"], ["chats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("chat_id", "user_id"),
    )
    op.create_index(
        "ix_chat_members_user_id_active", "chat_members", ["user_id"], postgresql_where=sa.text("left_at IS NULL")
    )
    op.create_index(
        "ix_chat_members_chat_id_active", "chat_members", ["chat_id"], postgresql_where=sa.text("left_at IS NULL")
    )


def downgrade() -> None:
    op.drop_index("ix_chat_members_chat_id_active", table_name="chat_members")
    op.drop_index("ix_chat_members_user_id_active", table_name="chat_members")
    op.drop_table("chat_members")
    op.drop_index("ix_chats_last_message_at_id", table_name="chats")
    op.drop_table("chats")

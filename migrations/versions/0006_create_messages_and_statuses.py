"""create messages and message statuses

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _enum(name: str, *values: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, create_constraint=True, length=32)


def upgrade() -> None:
    op.create_table(
        "messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("chat_id", sa.Uuid(), nullable=False),
        sa.Column("sender_id", sa.Uuid(), nullable=True),
        sa.Column("type", _enum("message_type", "text", "photo", "video", "system"), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("system_code", sa.String(64), nullable=True),
        sa.Column("system_payload", postgresql.JSONB(), nullable=True),
        sa.Column("reply_to_id", sa.Uuid(), nullable=True),
        sa.Column("client_message_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("edited_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["chat_id"], ["chats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["reply_to_id"], ["messages.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sender_id", "client_message_id"),
    )
    op.create_index("ix_messages_reply_to_id", "messages", ["reply_to_id"])
    op.create_index(
        "ix_messages_chat_id_created_at_id",
        "messages",
        ["chat_id", sa.text("created_at DESC"), sa.text("id DESC")],
    )

    op.create_table(
        "message_statuses",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("message_id", sa.Uuid(), nullable=False),
        sa.Column("chat_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("status", _enum("delivery_status", "sent", "delivered", "read"), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["chat_id"], ["chats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "user_id"),
    )
    op.create_index(
        "ix_message_statuses_user_chat_unread",
        "message_statuses",
        ["user_id", "chat_id"],
        postgresql_where=sa.text("status <> 'read'"),
    )
    op.create_index(
        "ix_message_statuses_user_undelivered",
        "message_statuses",
        ["user_id"],
        postgresql_where=sa.text("status = 'sent'"),
    )


def downgrade() -> None:
    op.drop_index("ix_message_statuses_user_undelivered", table_name="message_statuses")
    op.drop_index("ix_message_statuses_user_chat_unread", table_name="message_statuses")
    op.drop_table("message_statuses")
    op.drop_index("ix_messages_chat_id_created_at_id", table_name="messages")
    op.drop_index("ix_messages_reply_to_id", table_name="messages")
    op.drop_table("messages")

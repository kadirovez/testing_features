"""create media files and message attachments

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-23
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: str | None = "0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _enum(name: str, *values: str) -> sa.Enum:
    return sa.Enum(*values, name=name, native_enum=False, create_constraint=True, length=32)


def upgrade() -> None:
    op.create_table(
        "media_files",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_id", sa.Uuid(), nullable=False),
        sa.Column("kind", _enum("media_kind", "photo", "video"), nullable=False),
        sa.Column("purpose", _enum("media_purpose", "avatar", "chat_avatar", "message"), nullable=False),
        sa.Column(
            "status",
            _enum("media_status", "pending", "uploaded", "processing", "ready", "failed"),
            nullable=False,
        ),
        sa.Column("storage_key", sa.String(512), nullable=False),
        sa.Column("thumbnail_key", sa.String(512), nullable=True),
        sa.Column("mime_type", sa.String(128), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key"),
    )
    op.create_index(
        "ix_media_files_owner_id_created_at", "media_files", ["owner_id", sa.text("created_at DESC")]
    )
    op.create_index("ix_media_files_status_created_at", "media_files", ["status", "created_at"])

    op.create_table(
        "message_attachments",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("message_id", sa.Uuid(), nullable=False),
        sa.Column("media_id", sa.Uuid(), nullable=False),
        sa.Column("position", sa.SmallInteger(), nullable=False),
        sa.ForeignKeyConstraint(["message_id"], ["messages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["media_id"], ["media_files.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("media_id"),
    )
    op.create_index(
        "ix_message_attachments_message_id_position", "message_attachments", ["message_id", "position"]
    )

    op.create_foreign_key(
        "fk_users_avatar_media_id_media_files", "users", "media_files", ["avatar_media_id"], ["id"], ondelete="SET NULL"
    )
    op.create_foreign_key(
        "fk_chats_avatar_media_id_media_files", "chats", "media_files", ["avatar_media_id"], ["id"], ondelete="SET NULL"
    )


def downgrade() -> None:
    op.drop_constraint("fk_chats_avatar_media_id_media_files", "chats", type_="foreignkey")
    op.drop_constraint("fk_users_avatar_media_id_media_files", "users", type_="foreignkey")
    op.drop_index("ix_message_attachments_message_id_position", table_name="message_attachments")
    op.drop_table("message_attachments")
    op.drop_index("ix_media_files_status_created_at", table_name="media_files")
    op.drop_index("ix_media_files_owner_id_created_at", table_name="media_files")
    op.drop_table("media_files")

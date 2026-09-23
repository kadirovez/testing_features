from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, UniqueConstraint, func, true
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, CreatedAtMixin, TimestampMixin, UUIDPkMixin


class User(UUIDPkMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320))
    username: Mapped[str] = mapped_column(String(32))
    password_hash: Mapped[str] = mapped_column(String(255))
    display_name: Mapped[str] = mapped_column(String(64))
    bio: Mapped[str | None] = mapped_column(Text)
    avatar_media_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("media_files.id", ondelete="SET NULL", use_alter=True)
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default=true())
    last_seen_at: Mapped[datetime | None]
    deleted_at: Mapped[datetime | None]


Index("uq_users_email_lower", func.lower(User.email), unique=True)
Index("uq_users_username_lower", func.lower(User.username), unique=True)
# text_pattern_ops lets prefix LIKE use a btree regardless of the database collation
Index(
    "ix_users_username_lower_pattern",
    func.lower(User.username).label("username_lower"),
    postgresql_ops={"username_lower": "text_pattern_ops"},
)
Index(
    "ix_users_display_name_lower_pattern",
    func.lower(User.display_name).label("display_name_lower"),
    postgresql_ops={"display_name_lower": "text_pattern_ops"},
)


class Contact(UUIDPkMixin, CreatedAtMixin, Base):
    __tablename__ = "contacts"
    __table_args__ = (
        UniqueConstraint("owner_id", "contact_user_id"),
        CheckConstraint("owner_id <> contact_user_id", name="not_self"),
    )

    owner_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    contact_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    alias: Mapped[str | None] = mapped_column(String(64))

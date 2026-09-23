"""EXPLAIN ANALYZE the hot repository queries against synthetic volume.

Everything runs inside one transaction that is rolled back at the end, so the
target database is left untouched. Usage: PYTHONPATH=. python scripts/explain_indexes.py
"""

import asyncio
import sys
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine
from app.modules.chats import repository as chat_repo
from app.modules.messages import repository as message_repo
from app.modules.users import repository as user_repo

SEED_SQL = """
CREATE TEMP TABLE ex_users ON COMMIT DROP AS SELECT gen_random_uuid() AS id, g FROM generate_series(1, 20000) g;
CREATE TEMP TABLE ex_chats ON COMMIT DROP AS SELECT gen_random_uuid() AS id, g FROM generate_series(1, 5000) g;
INSERT INTO users (id, email, username, password_hash, display_name)
    SELECT id, 'ex' || g || '@explain.test', 'ex_' || left(md5(g::text), 20), 'x', 'User ' || g FROM ex_users;
INSERT INTO chats (id, type, title, last_message_at)
    SELECT id, 'group', 'chat ' || g, now() - g * interval '1 minute' FROM ex_chats;
INSERT INTO chat_members (id, chat_id, user_id, role)
    SELECT gen_random_uuid(), c.id, u.id, 'member'
    FROM ex_chats c CROSS JOIN generate_series(0, 9) k
    JOIN ex_users u ON u.g = ((c.g * 7 + k * 131) % 20000) + 2
    ON CONFLICT DO NOTHING;
INSERT INTO chat_members (id, chat_id, user_id, role)
    SELECT gen_random_uuid(), c.id, u.id, 'owner' FROM ex_chats c JOIN ex_users u ON u.g = 1 WHERE c.g <= 300;
INSERT INTO messages (id, chat_id, type, content, created_at)
    SELECT gen_random_uuid(), c.id, 'text', 'm' || m, now() - (c.g * 100 + m) * interval '1 second'
    FROM ex_chats c CROSS JOIN generate_series(1, 100) m;
INSERT INTO message_statuses (id, message_id, chat_id, user_id, status)
    SELECT gen_random_uuid(), msg.id, msg.chat_id, cm.user_id,
           CASE WHEN random() < 0.9 THEN 'read' WHEN random() < 0.5 THEN 'delivered' ELSE 'sent' END
    FROM messages msg JOIN ex_chats c ON c.id = msg.chat_id
    JOIN chat_members cm ON cm.chat_id = msg.chat_id
    WHERE c.g <= 1500 OR cm.role = 'owner';
ANALYZE users, chats, chat_members, messages, message_statuses;
"""

captured: list[tuple[str, Any]] = []


def _capture(conn: Any, cursor: Any, statement: str, parameters: Any, context: Any, executemany: bool) -> None:
    captured.append((statement, parameters))


async def _explain(db: AsyncSession, title: str) -> None:
    statement, parameters = captured[-1]
    connection = await db.connection()
    result = await connection.exec_driver_sql(f"EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) {statement}", parameters)
    print(f"\n=== {title} ===\n{statement}\n---")
    for (line,) in result.all():
        print(line)


async def main() -> None:
    async with engine.connect() as conn:
        transaction = await conn.begin()
        db = AsyncSession(bind=conn)
        try:
            for chunk in filter(str.strip, SEED_SQL.split(";\n")):
                await conn.execute(text(chunk.strip().rstrip(";")))
            owner_id: UUID = (await conn.execute(text("SELECT id FROM ex_users WHERE g = 1"))).scalar_one()
            busy_chat: UUID = (await conn.execute(text("SELECT id FROM ex_chats WHERE g = 42"))).scalar_one()
            chat_ids = list((await conn.execute(text("SELECT chat_id FROM chat_members WHERE user_id = :u"), {"u": owner_id})).scalars())
            middle = (await conn.execute(
                text("SELECT created_at, id FROM messages WHERE chat_id = :c ORDER BY created_at DESC, id DESC OFFSET 50 LIMIT 1"),
                {"c": busy_chat},
            )).one()

            event.listen(conn.sync_connection, "before_cursor_execute", _capture)

            await message_repo.list_messages(db, busy_chat, None, 50)
            await _explain(db, "messages: first page")
            await message_repo.list_messages(db, busy_chat, (middle[0], middle[1]), 50)
            await _explain(db, "messages: next page by (created_at, id) cursor")
            await message_repo.count_unread_by_chats(db, owner_id, chat_ids)
            await _explain(db, f"unread counts for {len(chat_ids)} chats")
            await chat_repo.list_user_chats(db, owner_id, None, 50)
            await _explain(db, "chat list of a user")
            await chat_repo.list_peer_ids(db, owner_id)
            await _explain(db, "presence audience (peer ids)")
            await message_repo.mark_read_up_to(db, owner_id, busy_chat, datetime.now(UTC), datetime.now(UTC))
            await _explain(db, "mark read up to")
            await user_repo.search_users(db, "user 123", owner_id, None, 20)
            await _explain(db, "user search by display name prefix")
        finally:
            await db.close()
            await transaction.rollback()
    await engine.dispose()


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))

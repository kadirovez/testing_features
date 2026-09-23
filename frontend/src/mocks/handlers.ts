import type { MediaRead, MessageCreate, MessageRead, Page, UploadCreate, UserUpdate } from "../api/types";
import { CHATS, CONTACTS, GROUP_MEMBERS, ME, MESSAGES, SETTINGS, USERS } from "./data";

type Query = Record<string, string | number | undefined | null> | undefined;
type Handler = (params: string[], query: Query, body: unknown) => unknown;

const tokens = {
  access_token: "mock-access",
  refresh_token: "mock-refresh",
  token_type: "bearer",
  expires_in: 900,
  session_id: "s-mock",
};

const PALETTE = ["#b9cbb4", "#d7c3a3", "#a9c1cf", "#cdb5c6", "#c9c29c"];

const MOCK_MEDIA = new Map<string, MediaRead>();

function mockMediaBrief(media: MediaRead) {
  const { owner_id: _owner, purpose: _purpose, created_at: _created, ...brief } = media;
  return brief;
}

function placeholderImage(seed: string): string {
  const color = PALETTE[seed.length % PALETTE.length];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='320' height='240'><rect width='100%' height='100%' fill='${color}'/><circle cx='230' cy='70' r='28' fill='#fff' opacity='.55'/><path d='M0 240 L110 120 L190 200 L250 150 L320 220 L320 240 Z' fill='#000' opacity='.12'/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function page<T>(items: T[]): Page<T> {
  return { items, next_cursor: null };
}

function chatMessages(chatId: string, limit: number): Page<MessageRead> {
  const items = MESSAGES.filter((m) => m.chat_id === chatId && !m.is_deleted)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
  return page(items);
}

const routes: Array<[string, RegExp, Handler]> = [
  ["POST", /^\/auth\/(login|register)$/, () => tokens],
  ["POST", /^\/auth\/logout$/, () => undefined],
  ["GET", /^\/users\/me$/, () => ME],
  ["PATCH", /^\/users\/me$/, (_p, _q, body) => Object.assign(ME, body as UserUpdate)],
  ["PUT", /^\/users\/me\/avatar$/, (_p, _q, body) => Object.assign(ME, { avatar_media_id: (body as { media_id: string }).media_id })],
  ["DELETE", /^\/users\/me\/avatar$/, () => Object.assign(ME, { avatar_media_id: null })],
  [
    "GET",
    /^\/users\/search$/,
    (_p, q) => {
      const needle = String(q?.q ?? "").toLowerCase();
      return page(
        USERS.filter(
          (u) => u.username.toLowerCase().startsWith(needle) || u.display_name.toLowerCase().startsWith(needle),
        ),
      );
    },
  ],
  ["GET", /^\/users\/([^/]+)$/, ([id]) => USERS.find((u) => u.id === id)],
  ["GET", /^\/contacts$/, () => page(CONTACTS)],
  [
    "DELETE",
    /^\/contacts\/([^/]+)$/,
    ([userId]) => {
      const idx = CONTACTS.findIndex((c) => c.user.id === userId);
      if (idx >= 0) CONTACTS.splice(idx, 1);
    },
  ],
  [
    "POST",
    /^\/contacts$/,
    (_p, _q, body) => {
      const { user_id: userId, alias } = body as { user_id: string; alias?: string };
      const user = USERS.find((u) => u.id === userId);
      if (!user) throw new Error("user not found");
      const contact = { user, alias: alias ?? null, created_at: new Date().toISOString() };
      if (!CONTACTS.some((c) => c.user.id === userId)) CONTACTS.unshift(contact);
      return contact;
    },
  ],
  ["GET", /^\/settings$/, () => SETTINGS],
  ["PATCH", /^\/settings$/, (_p, _q, body) => Object.assign(SETTINGS, body)],
  ["PUT", /^\/settings\/theme$/, (_p, _q, body) => Object.assign(SETTINGS, body)],
  ["GET", /^\/chats$/, () => page([...CHATS].sort((a, b) => b.last_message_at.localeCompare(a.last_message_at)))],
  [
    "POST",
    /^\/chats\/([^/]+)\/leave$/,
    ([id]) => {
      const idx = CHATS.findIndex((c) => c.id === id);
      if (idx >= 0) CHATS.splice(idx, 1);
    },
  ],
  [
    "POST",
    /^\/chats\/direct$/,
    (_p, _q, body) => {
      const userId = (body as { user_id: string }).user_id;
      const existing = CHATS.find((c) => c.peer?.id === userId);
      if (existing) return existing;
      const user = USERS.find((u) => u.id === userId);
      if (!user) throw new Error("user not found");
      const chat = {
        id: `c-${userId}`,
        type: "direct" as const,
        title: null,
        description: null,
        avatar_media_id: null,
        created_by: ME.id,
        created_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
        my_role: "member" as const,
        unread_count: 0,
        peer: { id: user.id, username: user.username, display_name: user.display_name, avatar_media_id: user.avatar_media_id },
      };
      CHATS.push(chat);
      return chat;
    },
  ],
  [
    "GET",
    /^\/chats\/([^/]+)\/members$/,
    ([id]) =>
      (GROUP_MEMBERS[id] ?? []).map((uid) => ({
        user: uid === ME.id ? ME : USERS.find((u) => u.id === uid),
        role: uid === "u-artem" ? "owner" : "member",
        joined_at: ME.created_at,
      })),
  ],
  ["GET", /^\/chats\/([^/]+)\/messages$/, ([id], q) => chatMessages(id, Number(q?.limit ?? 30))],
  [
    "POST",
    /^\/chats\/([^/]+)\/messages$/,
    ([id], _q, body) => {
      const data = body as MessageCreate;
      const mediaIds = data.media_ids ?? [];
      const attachments = mediaIds.map((mediaId) => {
        const media = MOCK_MEDIA.get(mediaId);
        return media
          ? mockMediaBrief(media)
          : {
              id: mediaId,
              kind: "photo" as const,
              status: "pending" as const,
              mime_type: "image/jpeg",
              size_bytes: 0,
              width: null,
              height: null,
              duration_ms: null,
              has_thumbnail: false,
            };
      });
      const message: MessageRead = {
        ...MESSAGES[0],
        id: `m-${Date.now()}`,
        chat_id: id,
        sender_id: ME.id,
        content: data.content ?? null,
        client_message_id: data.client_message_id ?? null,
        attachments,
        type: mediaIds.length > 0 ? "photo" : "text",
        created_at: new Date().toISOString(),
      };
      MESSAGES.push(message);
      return message;
    },
  ],
  ["POST", /^\/chats\/([^/]+)\/read$/, () => undefined],
  [
    "DELETE",
    /^\/messages\/([^/]+)$/,
    ([id]) => {
      const target = MESSAGES.find((m) => m.id === id);
      if (target) target.is_deleted = true;
    },
  ],
  ["GET", /^\/messages\/([^/]+)\/statuses$/, () => [{ user_id: "u-marina", status: "read", delivered_at: null, read_at: null }]],
  ["GET", /^\/media\/([^/]+)\/url$/, ([id]) => ({ url: placeholderImage(id), expires_in: 3600 })],
  [
    "GET",
    /^\/media\/([^/]+)$/,
    ([id]) => {
      const media = MOCK_MEDIA.get(id);
      if (!media) throw new Error(`mock media not found: ${id}`);
      return media;
    },
  ],
  [
    "POST",
    /^\/media\/uploads$/,
    (_p, _q, body) => {
      const data = body as UploadCreate;
      const id = `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const media: MediaRead = {
        id,
        owner_id: ME.id,
        kind: data.kind,
        purpose: data.purpose,
        status: "pending",
        mime_type: data.mime_type,
        size_bytes: data.size_bytes,
        width: null,
        height: null,
        duration_ms: null,
        has_thumbnail: false,
        created_at: new Date().toISOString(),
      };
      MOCK_MEDIA.set(id, media);
      return { media, upload_url: "", upload_fields: {}, expires_in: 60 };
    },
  ],
  [
    "POST",
    /^\/media\/([^/]+)\/complete$/,
    ([id]) => {
      const prev = MOCK_MEDIA.get(id);
      const media: MediaRead = {
        id,
        owner_id: ME.id,
        kind: prev?.kind ?? "photo",
        purpose: prev?.purpose ?? "message",
        status: "ready",
        mime_type: prev?.mime_type ?? "image/jpeg",
        size_bytes: prev?.size_bytes ?? 0,
        width: 1280,
        height: 960,
        duration_ms: null,
        has_thumbnail: true,
        created_at: prev?.created_at ?? new Date().toISOString(),
      };
      MOCK_MEDIA.set(id, media);
      return media;
    },
  ],
];

export async function mockRequest<T>(method: string, path: string, query: Query, body: unknown): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, 120));
  for (const [routeMethod, pattern, handler] of routes) {
    const match = routeMethod === method ? pattern.exec(path) : null;
    if (match) return structuredClone(handler(match.slice(1), query, body)) as T;
  }
  throw new Error(`mock route not found: ${method} ${path}`);
}

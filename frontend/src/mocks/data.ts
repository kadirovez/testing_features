import type { ChatRead, ContactRead, MessageRead, SettingsRead, UserPublicRead, UserRead } from "../api/types";

const minutesAgo = (m: number): string => new Date(Date.now() - m * 60_000).toISOString();

export const ME: UserRead = {
  id: "u-me",
  email: "alina@example.com",
  username: "alina_v",
  display_name: "Алина Воронцова",
  bio: "Фронтенд, велосипед и кофе без сахара",
  avatar_media_id: null,
  created_at: minutesAgo(60 * 24 * 90),
};

const user = (id: string, username: string, name: string, bio: string, seenMin: number): UserPublicRead => ({
  id,
  username,
  display_name: name,
  bio,
  avatar_media_id: null,
  last_seen_at: minutesAgo(seenMin),
});

export const USERS: UserPublicRead[] = [
  user("u-marina", "marina_k", "Марина Кольцова", "Дизайнер интерфейсов", 2),
  user("u-artem", "lyakhov", "Артём Ляхов", "Backend, Python", 45),
  user("u-oleg", "oleg.p", "Олег Петренко", "", 60 * 5),
  user("u-sveta", "sveta_d", "Светлана Дёмина", "Путешествую по Кавказу", 60 * 26),
  user("u-nikita", "nik_b", "Никита Бурцев", "", 12),
];

const brief = (u: UserPublicRead) => ({
  id: u.id,
  username: u.username,
  display_name: u.display_name,
  avatar_media_id: u.avatar_media_id,
});

const direct = (u: UserPublicRead, unread: number, lastMin: number): ChatRead => ({
  id: `c-${u.id}`,
  type: "direct",
  title: null,
  description: null,
  avatar_media_id: null,
  created_by: ME.id,
  created_at: minutesAgo(60 * 24 * 30),
  last_message_at: minutesAgo(lastMin),
  my_role: "member",
  unread_count: unread,
  peer: brief(u),
});

export const CHATS: ChatRead[] = [
  direct(USERS[0], 2, 3),
  {
    id: "c-dacha",
    type: "group",
    title: "Дача, выходные",
    description: "Планируем поездку на субботу",
    avatar_media_id: null,
    created_by: "u-artem",
    created_at: minutesAgo(60 * 24 * 7),
    last_message_at: minutesAgo(18),
    my_role: "admin",
    unread_count: 5,
    peer: null,
  },
  direct(USERS[1], 0, 50),
  direct(USERS[2], 0, 60 * 6),
  direct(USERS[3], 0, 60 * 30),
  direct(USERS[4], 1, 60 * 24 * 3),
];

export const GROUP_MEMBERS: Record<string, string[]> = {
  "c-dacha": [ME.id, "u-artem", "u-oleg", "u-sveta"],
};

let seq = 0;
const msg = (chatId: string, senderId: string, content: string, minAgo: number): MessageRead => ({
  id: `m-${++seq}`,
  chat_id: chatId,
  sender_id: senderId,
  type: "text",
  content,
  system_code: null,
  system_payload: null,
  system_text: null,
  reply_to_id: null,
  client_message_id: null,
  attachments: [],
  created_at: minutesAgo(minAgo),
  edited_at: null,
  deleted_at: null,
  is_deleted: false,
});

const photo = (m: MessageRead, id: string): MessageRead => ({
  ...m,
  type: "photo",
  attachments: [
    {
      id,
      kind: "photo",
      status: "ready",
      mime_type: "image/jpeg",
      size_bytes: 482_000,
      width: 1280,
      height: 960,
      duration_ms: null,
      has_thumbnail: true,
    },
  ],
});

export const MESSAGES: MessageRead[] = [
  msg("c-u-marina", "u-marina", "Привет! Ты сегодня в офисе?", 40),
  msg("c-u-marina", ME.id, "Привет, да, буду к двенадцати", 38),
  msg("c-u-marina", ME.id, "Что-то срочное?", 38),
  msg("c-u-marina", "u-marina", "Хотела показать новые экраны онбординга", 12),
  photo(msg("c-u-marina", "u-marina", "Вот черновик, глянь цвета", 11), "media-onb-1"),
  msg("c-u-marina", "u-marina", "Референсы тут: https://www.figma.com/community", 10),
  msg("c-u-marina", ME.id, "Выглядит здорово. Возьми хлеб по дороге, если будешь мимо пекарни", 4),
  msg("c-u-marina", "u-marina", "Договорились, возьму два багета", 3),
  msg("c-dacha", "u-artem", "Народ, выезжаем в субботу в 9:00 от метро", 120),
  msg("c-dacha", "u-oleg", "Я на своей машине, возьму троих", 110),
  msg("c-dacha", "u-oleg", "Кто со мной?", 109),
  msg("c-dacha", ME.id, "Я! И мангал захвачу", 100),
  photo(msg("c-dacha", "u-sveta", "Прошлогодняя фотка, чтобы настроиться", 60), "media-dacha-1"),
  msg("c-dacha", "u-sveta", "Я привезу салат и лимонад", 58),
  msg("c-dacha", "u-artem", "Прогноз обещает солнце, берите панамы", 18),
  msg("c-u-artem", ME.id, "Созвон перенесли на 18:30?", 70),
  msg("c-u-artem", "u-artem", "Да, в 18:30, ссылку кину в календарь", 50),
  msg("c-u-oleg", "u-oleg", "Спасибо за вчерашнее, всё починилось", 60 * 6),
  msg("c-u-sveta", ME.id, "Как добралась до Домбая?", 60 * 31),
  msg("c-u-sveta", "u-sveta", "Отлично, тут уже снег лежит", 60 * 30),
  msg("c-u-nikita", "u-nikita", "Вернёшь книжку на неделе?", 60 * 24 * 3),
];

export const CONTACTS: ContactRead[] = USERS.map((u) => ({ user: u, alias: null, created_at: minutesAgo(60 * 24 * 20) }));

export const SETTINGS: SettingsRead = {
  notifications_enabled: true,
  notification_preview: true,
  read_receipts_visible: true,
  online_status_visibility: "everyone",
  language: "ru",
  theme: { mode: "light" },
  updated_at: minutesAgo(60),
};
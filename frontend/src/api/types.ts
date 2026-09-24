// Mirrors backend Pydantic schemas (backend/app/modules/*/schemas.py).

export type UUID = string;
export type ISODate = string;

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
}

// ---- auth ----
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  display_name: string;
  device_name?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  device_name?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  session_id: UUID;
}

// ---- users ----
export interface UserBrief {
  id: UUID;
  username: string;
  display_name: string;
  avatar_media_id: UUID | null;
}

export interface UserRead extends UserBrief {
  email: string;
  bio: string | null;
  created_at: ISODate;
}

export interface UserPublicRead extends UserBrief {
  bio: string | null;
  last_seen_at: ISODate | null;
}

export interface UserUpdate {
  username?: string;
  display_name?: string;
  bio?: string;
}

export interface ContactRead {
  user: UserPublicRead;
  alias: string | null;
  created_at: ISODate;
}

// ---- chats ----
export type ChatType = "direct" | "group";
export type ChatRole = "owner" | "admin" | "member";

export interface ChatRead {
  id: UUID;
  type: ChatType;
  title: string | null;
  description: string | null;
  avatar_media_id: UUID | null;
  created_by: UUID | null;
  created_at: ISODate;
  last_message_at: ISODate;
  my_role: ChatRole;
  unread_count: number;
  peer: UserBrief | null;
}

export interface ChatMemberRead {
  user: UserBrief;
  role: ChatRole;
  joined_at: ISODate;
}

// ---- media ----
export type MediaKind = "photo" | "video";
export type MediaPurpose = "avatar" | "chat_avatar" | "chat_wallpaper" | "message";
export type MediaStatus = "pending" | "uploaded" | "processing" | "ready" | "failed";
export type MediaVariant = "original" | "thumbnail";

export interface MediaBrief {
  id: UUID;
  kind: MediaKind;
  status: MediaStatus;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  has_thumbnail: boolean;
}

export interface MediaRead extends MediaBrief {
  owner_id: UUID;
  purpose: MediaPurpose;
  created_at: ISODate;
}

export interface UploadCreate {
  kind: MediaKind;
  purpose: MediaPurpose;
  mime_type: string;
  size_bytes: number;
}

export interface UploadRead {
  media: MediaRead;
  upload_url: string;
  upload_fields: Record<string, string>;
  expires_in: number;
}

export interface DownloadUrlRead {
  url: string;
  expires_in: number;
}

// ---- messages ----
export type MessageType = "text" | "photo" | "video" | "system";
export type DeliveryStatus = "sent" | "delivered" | "read";

export interface MessageRead {
  id: UUID;
  chat_id: UUID;
  sender_id: UUID | null;
  type: MessageType;
  content: string | null;
  system_code: string | null;
  system_payload: Record<string, unknown> | null;
  system_text: string | null;
  reply_to_id: UUID | null;
  client_message_id: UUID | null;
  attachments: MediaBrief[];
  created_at: ISODate;
  edited_at: ISODate | null;
  deleted_at: ISODate | null;
  is_deleted: boolean;
}

export interface MessageCreate {
  content?: string;
  media_ids?: UUID[];
  reply_to_id?: UUID;
  client_message_id?: UUID;
}

export interface MessageStatusRead {
  user_id: UUID;
  status: DeliveryStatus;
  delivered_at: ISODate | null;
  read_at: ISODate | null;
}

// ---- settings ----
export type OnlineStatusVisibility = "everyone" | "contacts" | "nobody";

export interface SettingsRead {
  notifications_enabled: boolean;
  notification_preview: boolean;
  read_receipts_visible: boolean;
  online_status_visibility: OnlineStatusVisibility;
  language: string;
  theme: Record<string, unknown>;
  updated_at: ISODate;
}

export interface SettingsUpdate {
  notifications_enabled?: boolean;
  notification_preview?: boolean;
  read_receipts_visible?: boolean;
  online_status_visibility?: OnlineStatusVisibility;
  language?: string;
}

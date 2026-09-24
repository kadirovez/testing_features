import { config } from "../config";
import { http, uploadBinary } from "./client";
import type { DownloadUrlRead, MediaKind, MediaPurpose, MediaRead, MediaVariant, UploadRead, UUID } from "./types";

async function uploadToStorage(upload: UploadRead, file: File): Promise<void> {
  const form = new FormData();
  Object.entries(upload.upload_fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", file);
  const response = await fetch(upload.upload_url, { method: "POST", body: form });
  if (!response.ok) throw new Error(`storage upload failed: ${response.status}`);
}

function kindForFile(file: File): MediaKind {
  return file.type.startsWith("video/") ? "video" : "photo";
}

export const mediaApi = {
  url: (mediaId: UUID, variant: MediaVariant = "original") =>
    http.get<DownloadUrlRead>(`/media/${mediaId}/url`, { variant }),

  get: (mediaId: UUID) => http.get<MediaRead>(`/media/${mediaId}`),

  async reserve(file: File, purpose: MediaPurpose): Promise<UploadRead> {
    return http.post<UploadRead>("/media/uploads", {
      kind: kindForFile(file),
      purpose,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });
  },

  uploadToStorage,

  complete: (mediaId: UUID) => http.post<MediaRead>(`/media/${mediaId}/complete`),

  putContent: (mediaId: UUID, file: File) => uploadBinary(`/media/${mediaId}/content`, file),

  /** Reserve -> upload via API (user-owned object in storage) -> confirm. */
  async upload(file: File, purpose: MediaPurpose): Promise<MediaRead> {
    const reserved = await mediaApi.reserve(file, purpose);
    if (!config.useMocks) await mediaApi.putContent(reserved.media.id, file);
    return mediaApi.complete(reserved.media.id);
  },
};

import { config } from "../config";
import { http } from "./client";
import type { DownloadUrlRead, MediaKind, MediaPurpose, MediaRead, MediaVariant, UploadRead, UUID } from "./types";

async function uploadToStorage(upload: UploadRead, file: File): Promise<void> {
  const form = new FormData();
  Object.entries(upload.upload_fields).forEach(([key, value]) => form.append(key, value));
  form.append("file", file);
  const response = await fetch(upload.upload_url, { method: "POST", body: form });
  if (!response.ok) throw new Error(`storage upload failed: ${response.status}`);
}

export const mediaApi = {
  url: (mediaId: UUID, variant: MediaVariant = "original") =>
    http.get<DownloadUrlRead>(`/media/${mediaId}/url`, { variant }),

  /** Presigned upload flow: reserve -> upload to object storage -> confirm. */
  async upload(file: File, purpose: MediaPurpose): Promise<MediaRead> {
    const kind: MediaKind = file.type.startsWith("video/") ? "video" : "photo";
    const upload = await http.post<UploadRead>("/media/uploads", {
      kind,
      purpose,
      mime_type: file.type,
      size_bytes: file.size,
    });
    if (!config.useMocks) await uploadToStorage(upload, file);
    return http.post<MediaRead>(`/media/${upload.media.id}/complete`);
  },
};

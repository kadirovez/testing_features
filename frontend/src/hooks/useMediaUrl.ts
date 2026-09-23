import { useEffect, useState } from "react";
import { ApiError } from "../api/client";
import { mediaApi } from "../api/media";
import type { MediaVariant, UUID } from "../api/types";

interface CachedUrl {
  url: string;
  expiresAt: number;
}

const cache = new Map<string, CachedUrl>();
const pending = new Map<string, Promise<string | null>>();

async function resolveUrl(mediaId: UUID, variant: MediaVariant): Promise<string | null> {
  const key = `${mediaId}:${variant}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

  const inflight = pending.get(key);
  if (inflight) return inflight;

  const promise = mediaApi
    .url(mediaId, variant)
    .then(({ url, expires_in }) => {
      // Refresh a bit before the presigned URL actually expires.
      cache.set(key, { url, expiresAt: Date.now() + (expires_in - 30) * 1000 });
      return url;
    })
    .catch((error: unknown) => {
      if (error instanceof ApiError) return null;
      throw error;
    })
    .finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
}

export function useMediaUrl(mediaId: UUID | null | undefined, variant: MediaVariant = "thumbnail"): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void resolveUrl(mediaId, variant).then((value) => {
      if (!cancelled) setUrl(value);
    });
    return () => {
      cancelled = true;
    };
  }, [mediaId, variant]);

  return url;
}

export const MEDIA_BUBBLE_MAX_WIDTH = 340;
export const MEDIA_BUBBLE_MAX_HEIGHT = 480;
export const MEDIA_GRID_MAX_HEIGHT = 260;

/** Pixel size for a single attachment so the bubble matches the image aspect ratio. */
export function fitSingleMediaBox(
  width: number | null,
  height: number | null,
  maxW = MEDIA_BUBBLE_MAX_WIDTH,
  maxH = MEDIA_BUBBLE_MAX_HEIGHT,
): { width: number; height: number } {
  const w = width && width > 0 ? width : 4;
  const h = height && height > 0 ? height : 3;
  const scale = Math.min(maxW / w, maxH / h, 1);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

export function mediaAspectRatio(width: number | null, height: number | null): string {
  const w = width && width > 0 ? width : 4;
  const h = height && height > 0 ? height : 3;
  return `${w} / ${h}`;
}

export const AVATAR_OUTPUT_SIZE = 512;

export interface CropTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export function cropImageToSquare(
  image: HTMLImageElement,
  viewportSize: number,
  transform: CropTransform,
  outputSize = AVATAR_OUTPUT_SIZE,
): Promise<Blob> {
  const { zoom, offsetX, offsetY } = transform;
  const iw = image.naturalWidth;
  const ih = image.naturalHeight;
  const baseScale = Math.max(viewportSize / iw, viewportSize / ih);
  const scale = baseScale * zoom;
  const scaledW = iw * scale;
  const scaledH = ih * scale;
  const x = (viewportSize - scaledW) / 2 + offsetX;
  const y = (viewportSize - scaledH) / 2 + offsetY;

  const sourceX = -x / scale;
  const sourceY = -y / scale;
  const sourceSize = viewportSize / scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas unavailable"));

  ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("failed to encode image"));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export function squareAvatarFile(blob: Blob): File {
  return new File([blob], "avatar.jpg", { type: "image/jpeg" });
}

export async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();
  return image;
}

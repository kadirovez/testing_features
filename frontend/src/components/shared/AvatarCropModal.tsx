import { Check, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { useLocale } from "../../context/LocaleContext";
import { cropImageToSquare, loadImage, squareAvatarFile, type CropTransform } from "../../utils/cropImageToSquare";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "./IconButton";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface AvatarCropModalProps {
  imageSrc: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function AvatarCropModal({ imageSrc, onConfirm, onCancel }: AvatarCropModalProps) {
  const { t } = useLocale();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [viewportSize, setViewportSize] = useState(320);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const update = () => setViewportSize(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setImage(null);
    void loadImage(imageSrc).then((img) => {
      if (!cancelled) setImage(img);
    });
    return () => {
      cancelled = true;
    };
  }, [imageSrc]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    viewportRef.current?.setPointerCapture(event.pointerId);
    dragStart.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (event.clientX - dragStart.current.x),
      y: dragStart.current.oy + (event.clientY - dragStart.current.y),
    });
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = null;
    setDragging(false);
    viewportRef.current?.releasePointerCapture(event.pointerId);
  };

  const imageStyle = useMemo((): CSSProperties => {
    if (!image) return { transform: "translate(-50%, -50%)" };
    const v = viewportSize;
    const baseScale = Math.max(v / image.naturalWidth, v / image.naturalHeight) * zoom;
    const w = image.naturalWidth * baseScale;
    const h = image.naturalHeight * baseScale;
    return {
      width: w,
      height: h,
      transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
    };
  }, [image, viewportSize, zoom, offset.x, offset.y]);

  const onSubmit = async () => {
    const viewport = viewportRef.current;
    if (!image || !viewport || busy) return;
    setBusy(true);
    try {
      const transform: CropTransform = { zoom, offsetX: offset.x, offsetY: offset.y };
      const blob = await cropImageToSquare(image, viewportSize, transform);
      onConfirm(squareAvatarFile(blob));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        showClose={false}
        aria-describedby={undefined}
        overlayClassName="bg-black/80"
        className="flex w-[min(100%-2rem,420px)] max-w-none flex-col gap-0 overflow-hidden border-white/10 bg-neutral-950 p-0 text-white"
      >
        <header className="flex items-center gap-2 px-2 py-2">
          <IconButton label={t("common.close")} className="text-white/80 hover:bg-white/10 hover:text-white" onClick={onCancel}>
            <X strokeWidth={1.75} />
          </IconButton>
          <DialogTitle className="text-[15px] font-semibold">{t("avatar.cropTitle")}</DialogTitle>
        </header>
        <div className="grid place-items-center px-4 pb-4">
          <div
            ref={viewportRef}
            className={cn(
              "relative aspect-square w-[min(calc(100vw-4rem),360px)] touch-none overflow-hidden select-none",
              dragging ? "cursor-grabbing" : "cursor-grab",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {image && (
              <img
                className="pointer-events-none absolute top-1/2 left-1/2 max-w-none will-change-transform"
                src={imageSrc}
                alt=""
                style={imageStyle}
                draggable={false}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]" aria-hidden />
          </div>
        </div>
        <footer className="flex items-center gap-4 border-t border-white/10 px-4 py-3">
          <input
            className="flex-1 accent-[var(--accent)]"
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            aria-label={t("avatar.cropZoom")}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <Button
            size="icon"
            className="size-11 rounded-full"
            disabled={busy}
            aria-label={t("avatar.cropConfirm")}
            onClick={() => void onSubmit()}
          >
            <Check className="size-5" strokeWidth={2.25} />
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

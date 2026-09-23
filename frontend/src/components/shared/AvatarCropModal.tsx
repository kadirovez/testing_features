import { Check, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useLocale } from "../../context/LocaleContext";
import { useDismiss } from "../../hooks/useDismiss";
import { cropImageToSquare, loadImage, squareAvatarFile, type CropTransform } from "../../utils/cropImageToSquare";
import { cx } from "../../utils/cx";
import { IconButton } from "./IconButton";
import styles from "./AvatarCropModal.module.css";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

interface AvatarCropModalProps {
  imageSrc: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function AvatarCropModal({ imageSrc, onConfirm, onCancel }: AvatarCropModalProps) {
  const { t } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [viewportSize, setViewportSize] = useState(320);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useDismiss(rootRef, true, onCancel);

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

  return createPortal(
    <div ref={rootRef} className={styles.backdrop} role="dialog" aria-modal aria-label={t("avatar.cropTitle")}>
      <header className={styles.header}>
        <IconButton label={t("common.close")} className={styles.close} onClick={onCancel}>
          <X size={22} strokeWidth={1.75} />
        </IconButton>
        <h2 className={styles.title}>{t("avatar.cropTitle")}</h2>
        <span style={{ width: 44 }} aria-hidden />
      </header>
      <div className={styles.stage}>
        <div
          ref={viewportRef}
          className={cx(styles.viewport, dragging && styles.viewportDragging)}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {image && <img className={styles.image} src={imageSrc} alt="" style={imageStyle} draggable={false} />}
          <div className={styles.mask} aria-hidden />
        </div>
      </div>
      <footer className={styles.footer}>
        <input
          className={styles.zoom}
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          aria-label={t("avatar.cropZoom")}
          onChange={(e) => setZoom(Number(e.target.value))}
        />
        <button type="button" className={styles.confirm} disabled={busy} aria-label={t("avatar.cropConfirm")} onClick={() => void onSubmit()}>
          <Check size={26} strokeWidth={2} />
        </button>
      </footer>
    </div>,
    document.body,
  );
}

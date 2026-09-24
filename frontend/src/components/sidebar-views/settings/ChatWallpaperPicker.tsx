import { ImageUp, Loader2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { mediaApi } from "../../../api/media";
import { WALLPAPER_PRESETS, type WallpaperPresetId } from "../../../chatWallpaper/presets";
import { useChatAppearance } from "../../../context/ChatAppearanceContext";
import { useLocale } from "../../../context/LocaleContext";
import { useAppearanceThemeSave } from "../../../hooks/useAppearanceThemeSave";
import { useMediaUrl } from "../../../hooks/useMediaUrl";
import { cx } from "../../../utils/cx";
import styles from "./ChatWallpaperPicker.module.css";

export function ChatWallpaperPicker() {
  const { t } = useLocale();
  const { chatWallpaper, setPresetWallpaper, setCustomWallpaper } = useChatAppearance();
  const saveAppearanceTheme = useAppearanceThemeSave();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customPreview = useMediaUrl(
    chatWallpaper.kind === "custom" ? chatWallpaper.mediaId : null,
    "original",
  );

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setBusy(true);
    setError(null);
    try {
      const media = await mediaApi.upload(file, "chat_wallpaper");
      const wallpaper = { kind: "custom" as const, mediaId: media.id };
      setCustomWallpaper(media.id);
      await saveAppearanceTheme({ chatWallpaper: wallpaper });
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const isPresetActive = (id: WallpaperPresetId) => chatWallpaper.kind === "preset" && chatWallpaper.presetId === id;
  const customActive = chatWallpaper.kind === "custom";

  return (
    <div className={styles.block}>
      <p className={styles.label}>{t("settings.wallpaper.title")}</p>
      <div className={styles.grid}>
        {WALLPAPER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={cx(styles.tile, isPresetActive(preset.id) && styles.active)}
            aria-label={t(preset.labelKey)}
            aria-pressed={isPresetActive(preset.id)}
            onClick={() => {
              const wallpaper = { kind: "preset" as const, presetId: preset.id };
              setPresetWallpaper(preset.id);
              void saveAppearanceTheme({ chatWallpaper: wallpaper }).catch((err: unknown) => {
                if (err instanceof Error) setError(err.message);
              });
            }}
          >
            <span
              className={styles.preview}
              style={{
                backgroundImage: `url(${preset.src})`,
                backgroundSize: preset.tiled ? preset.tileSize : "cover",
              }}
            />
          </button>
        ))}
        <button
          type="button"
          className={cx(styles.tile, styles.upload, customActive && styles.active)}
          aria-pressed={customActive}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 size={22} strokeWidth={1.75} className={styles.spin} />
          ) : customPreview ? (
            <span className={styles.preview} style={{ backgroundImage: `url(${customPreview})`, backgroundSize: "cover" }} />
          ) : (
            <>
              <ImageUp size={22} strokeWidth={1.75} />
              <span className={styles.uploadText}>{t("settings.wallpaper.custom")}</span>
            </>
          )}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e)} />
    </div>
  );
}

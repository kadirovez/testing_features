import { ImageUp, Loader2 } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { mediaApi } from "../../../api/media";
import {
  isNeutralWallpaperPreset,
  WALLPAPER_PRESETS,
  type WallpaperPresetId,
} from "../../../chatWallpaper/presets";
import { useChatAppearance } from "../../../context/ChatAppearanceContext";
import { useLocale } from "../../../context/LocaleContext";
import { useAppearanceThemeSave } from "../../../hooks/useAppearanceThemeSave";
import { useMediaUrl } from "../../../hooks/useMediaUrl";
import { cn } from "@/lib/utils";

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

  const tile =
    "relative aspect-[3/4] overflow-hidden rounded-md border bg-chat transition-[box-shadow,border-color] duration-150 outline-none hover:border-ring/50 focus-visible:ring-2 focus-visible:ring-ring/50";

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{t("settings.wallpaper.title")}</p>
      <div className="grid grid-cols-4 gap-2">
        {WALLPAPER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={cn(tile, isPresetActive(preset.id) && "border-primary ring-2 ring-primary/40")}
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
            {isNeutralWallpaperPreset(preset) ? (
              <span className="absolute inset-0 bg-chat" aria-hidden />
            ) : (
              <span
                className="absolute inset-0 opacity-70 dark:opacity-40 dark:[filter:brightness(1.65)_contrast(1.12)]"
                style={{
                  backgroundImage: `url(${preset.src})`,
                  backgroundSize: preset.tiled ? preset.tileSize : "cover",
                  backgroundRepeat: preset.tiled ? "repeat" : "no-repeat",
                }}
              />
            )}
          </button>
        ))}
        <button
          type="button"
          className={cn(
            tile,
            "flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground",
            customActive && "border-primary ring-2 ring-primary/40",
          )}
          aria-pressed={customActive}
          aria-label={t("settings.wallpaper.custom")}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-5 animate-spin" strokeWidth={1.75} />
          ) : customPreview ? (
            <span
              className="absolute inset-0"
              style={{ backgroundImage: `url(${customPreview})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
          ) : (
            <>
              <ImageUp className="size-5" strokeWidth={1.75} />
              <span className="text-[11px] font-medium">{t("settings.wallpaper.custom")}</span>
            </>
          )}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e)} />
    </div>
  );
}

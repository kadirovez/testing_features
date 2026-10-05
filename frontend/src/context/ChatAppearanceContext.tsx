import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { getChatWallpaperPatternStyle } from "../chatWallpaper/applyWallpaper";
import type { ChatWallpaperConfig } from "../chatWallpaper/presets";
import { parseChatWallpaper, type WallpaperPresetId } from "../chatWallpaper/presets";
import { useMediaUrl } from "../hooks/useMediaUrl";
import {
  applyAccentPresetToDocument,
  type AccentPresetId,
  parseAccentPreset,
} from "../theme/accentPresets";
import {
  readStoredAccent,
  readStoredWallpaper,
  writeStoredAccent,
  writeStoredWallpaper,
} from "../theme/appearanceStorage";
import { useTheme } from "./ThemeContext";

interface ChatAppearanceValue {
  chatWallpaper: ChatWallpaperConfig;
  chatWallpaperPatternStyle: CSSProperties | undefined;
  accentPreset: AccentPresetId;
  serverTheme: Record<string, unknown>;
  hydrated: boolean;
  setServerTheme: (theme: Record<string, unknown>) => void;
  setHydrated: (value: boolean) => void;
  loadFromServerTheme: (theme: Record<string, unknown>) => void;
  setPresetWallpaper: (presetId: WallpaperPresetId) => void;
  setCustomWallpaper: (mediaId: string) => void;
  setAccentPreset: (presetId: AccentPresetId) => void;
}

const ChatAppearanceContext = createContext<ChatAppearanceValue | null>(null);

export function ChatAppearanceProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme();
  const [chatWallpaper, setChatWallpaper] = useState<ChatWallpaperConfig>(readStoredWallpaper);
  const [accentPreset, setAccentPresetState] = useState<AccentPresetId>(readStoredAccent);
  const [serverTheme, setServerTheme] = useState<Record<string, unknown>>({});
  const [hydrated, setHydrated] = useState(false);
  const customUrl = useMediaUrl(
    chatWallpaper.kind === "custom" ? chatWallpaper.mediaId : null,
    "original",
  );

  const chatWallpaperPatternStyle = useMemo(
    () => getChatWallpaperPatternStyle(chatWallpaper, customUrl, theme),
    [chatWallpaper, customUrl, theme],
  );

  useEffect(() => {
    applyAccentPresetToDocument(accentPreset);
  }, [accentPreset, theme]);

  const loadFromServerTheme = useCallback((theme: Record<string, unknown>) => {
    setServerTheme(theme);
    if (theme.chatWallpaper != null) {
      const wallpaper = parseChatWallpaper(theme.chatWallpaper);
      setChatWallpaper(wallpaper);
      writeStoredWallpaper(wallpaper);
    }
    if (theme.accentId != null) {
      const accent = parseAccentPreset(theme);
      setAccentPresetState(accent);
      writeStoredAccent(accent);
    }
  }, []);

  const setAccentPreset = useCallback((presetId: AccentPresetId) => {
    setAccentPresetState(presetId);
    writeStoredAccent(presetId);
  }, []);

  const setPresetWallpaper = useCallback((presetId: WallpaperPresetId) => {
    const next = { kind: "preset" as const, presetId };
    setChatWallpaper(next);
    writeStoredWallpaper(next);
  }, []);

  const setCustomWallpaper = useCallback((mediaId: string) => {
    const next = { kind: "custom" as const, mediaId };
    setChatWallpaper(next);
    writeStoredWallpaper(next);
  }, []);

  const value = useMemo(
    () => ({
      chatWallpaper,
      chatWallpaperPatternStyle,
      accentPreset,
      serverTheme,
      hydrated,
      setServerTheme,
      setHydrated,
      loadFromServerTheme,
      setPresetWallpaper,
      setCustomWallpaper,
      setAccentPreset,
    }),
    [
      chatWallpaper,
      chatWallpaperPatternStyle,
      accentPreset,
      serverTheme,
      hydrated,
      loadFromServerTheme,
      setPresetWallpaper,
      setCustomWallpaper,
      setAccentPreset,
    ],
  );

  return <ChatAppearanceContext.Provider value={value}>{children}</ChatAppearanceContext.Provider>;
}

export function useChatAppearance(): ChatAppearanceValue {
  const value = useContext(ChatAppearanceContext);
  if (!value) throw new Error("useChatAppearance must be used inside ChatAppearanceProvider");
  return value;
}

export { accentPresetToPayload, chatWallpaperToPayload } from "../theme/appearanceStorage";

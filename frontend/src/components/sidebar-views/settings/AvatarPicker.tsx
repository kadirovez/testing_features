import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { mediaApi } from "../../../api/media";
import { usersApi } from "../../../api/users";
import { useLocale } from "../../../context/LocaleContext";
import { useStore } from "../../../context/StoreContext";
import { Avatar } from "../../shared/Avatar";
import { AvatarCropModal } from "../../shared/AvatarCropModal";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AvatarPicker() {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = state.users.me;

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    },
    [preview, cropSrc],
  );

  const hasAvatar = Boolean(me?.avatar_media_id || preview);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setCropSrc(URL.createObjectURL(file));
  };

  const onCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const onCropConfirm = async (file: File) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    setError(null);
    try {
      const media = await mediaApi.upload(file, "avatar");
      dispatch({ type: "users/me", user: await usersApi.setAvatar(media.id) });
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onUpload = () => {
    closeMenu();
    inputRef.current?.click();
  };

  const onDelete = async () => {
    closeMenu();
    if (!hasAvatar) return;
    setBusy(true);
    setError(null);
    try {
      const user = await usersApi.removeAvatar();
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      dispatch({ type: "users/me", user });
    } catch (err) {
      if (!(err instanceof Error)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;

  const menuDisabled = busy || Boolean(cropSrc);

  return (
    <div className="flex flex-col items-center gap-2 px-4 pt-6 pb-5">
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex flex-col items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-wait"
            aria-label={t("settings.avatarMenu")}
            disabled={menuDisabled}
          >
            <span className="relative">
              <Avatar name={me.username} seed={me.id} mediaId={me.avatar_media_id} src={preview} size="xl" previewOnClick={false} />
              <span
                className={cn(
                  "absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white transition-opacity duration-150",
                  busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100",
                )}
              >
                {busy ? <Loader2 className="size-7 animate-spin" /> : <Camera className="size-7" strokeWidth={1.5} />}
              </span>
            </span>
            <span className="text-xs text-primary">{t("settings.avatar")}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem onSelect={onUpload}>
            <ImageUp strokeWidth={1.75} />
            {t("settings.avatarUpload")}
          </DropdownMenuItem>
          {hasAvatar && (
            <DropdownMenuItem variant="destructive" onSelect={() => void onDelete()}>
              <Trash2 strokeWidth={1.75} />
              {t("settings.avatarDelete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      {cropSrc && <AvatarCropModal imageSrc={cropSrc} onConfirm={(file) => void onCropConfirm(file)} onCancel={onCropCancel} />}
    </div>
  );
}

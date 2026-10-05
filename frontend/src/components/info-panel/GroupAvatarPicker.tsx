import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { chatsApi } from "../../api/chats";
import { mediaApi } from "../../api/media";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { Avatar } from "../shared/Avatar";
import { AvatarCropModal } from "../shared/AvatarCropModal";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GroupAvatarPickerProps {
  chatId: UUID;
  name: string;
  seed: string;
  mediaId: UUID | null;
}

export function GroupAvatarPicker({ chatId, name, seed, mediaId }: GroupAvatarPickerProps) {
  const { dispatch } = useStore();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    },
    [preview, cropSrc],
  );

  const applyAvatar = async (file: File) => {
    setBusy(true);
    try {
      const media = await mediaApi.upload(file, "chat_avatar");
      const chat = await chatsApi.update(chatId, { avatar_media_id: media.id });
      dispatch({ type: "chats/upserted", chat });
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(file));
    } finally {
      setBusy(false);
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
  };

  const onCropCancel = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const onCropConfirm = async (file: File) => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    await applyAvatar(file);
  };

  const onDelete = async () => {
    closeMenu();
    setBusy(true);
    try {
      const chat = await chatsApi.update(chatId, { avatar_media_id: null });
      dispatch({ type: "chats/upserted", chat });
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const hasAvatar = Boolean(mediaId || preview);

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group flex flex-col items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-wait"
            disabled={busy}
            aria-label={t("info.groupAvatarMenu")}
          >
            <span className="relative">
              <Avatar name={name} seed={seed} mediaId={mediaId} src={preview} size="xl" previewOnClick={false} />
              <span
                className={cn(
                  "absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white transition-opacity duration-150",
                  busy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-[state=open]:opacity-100",
                )}
              >
                {busy ? <Loader2 className="size-6 animate-spin" strokeWidth={1.75} /> : <Camera className="size-6" strokeWidth={1.75} />}
              </span>
            </span>
            <span className="text-xs text-primary">{t("info.groupAvatar")}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center">
          <DropdownMenuItem
            onSelect={() => {
              closeMenu();
              inputRef.current?.click();
            }}
          >
            <ImageUp strokeWidth={1.75} />
            {t("info.groupAvatarUpload")}
          </DropdownMenuItem>
          {hasAvatar && (
            <DropdownMenuItem variant="destructive" onSelect={() => void onDelete()}>
              <Trash2 strokeWidth={1.75} />
              {t("info.groupAvatarDelete")}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {cropSrc && (
        <AvatarCropModal imageSrc={cropSrc} onCancel={onCropCancel} onConfirm={(file) => void onCropConfirm(file)} />
      )}
    </>
  );
}

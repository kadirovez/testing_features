import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { chatsApi } from "../../api/chats";
import { mediaApi } from "../../api/media";
import type { UUID } from "../../api/types";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { Avatar } from "../shared/Avatar";
import { AvatarCropModal } from "../shared/AvatarCropModal";
import { Dropdown, DropdownItem } from "../shared/Dropdown";
import styles from "./GroupAvatarPicker.module.css";

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
      <input ref={inputRef} type="file" accept="image/*" className={styles.hidden} onChange={onFile} />
      <Dropdown
        open={menuOpen}
        onClose={closeMenu}
        trigger={
          <button
            type="button"
            className={styles.trigger}
            disabled={busy}
            aria-label={t("info.groupAvatarMenu")}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={styles.avatarWrap}>
              <Avatar name={name} seed={seed} mediaId={mediaId} src={preview} size="xl" previewOnClick={false} />
              <span className={styles.overlay}>
                {busy ? <Loader2 size={22} strokeWidth={1.75} className={styles.spin} /> : <Camera size={22} strokeWidth={1.75} />}
              </span>
            </span>
            <span className={styles.hint}>{t("info.groupAvatar")}</span>
          </button>
        }
      >
        <DropdownItem icon={<ImageUp size={18} strokeWidth={1.75} />} label={t("info.groupAvatarUpload")} onSelect={() => { closeMenu(); inputRef.current?.click(); }} />
        {hasAvatar && (
          <DropdownItem icon={<Trash2 size={18} strokeWidth={1.75} />} label={t("info.groupAvatarDelete")} danger onSelect={() => void onDelete()} />
        )}
      </Dropdown>
      {cropSrc && (
        <AvatarCropModal imageSrc={cropSrc} onCancel={onCropCancel} onConfirm={(file) => void onCropConfirm(file)} />
      )}
    </>
  );
}

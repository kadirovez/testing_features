import { Camera, ImageUp, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { mediaApi } from "../../../api/media";
import { usersApi } from "../../../api/users";
import { useLocale } from "../../../context/LocaleContext";
import { useStore } from "../../../context/StoreContext";
import { Avatar } from "../../shared/Avatar";
import { AvatarCropModal } from "../../shared/AvatarCropModal";
import { Dropdown, DropdownItem } from "../../shared/Dropdown";
import styles from "./settings.module.css";

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
    <div className={styles.avatarBlock}>
      <Dropdown
        open={menuOpen}
        onClose={closeMenu}
        align="center"
        trigger={
          <button
            type="button"
            className={styles.avatarMenuTrigger}
            aria-label={t("settings.avatarMenu")}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            disabled={menuDisabled}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.avatarButton}>
              <Avatar name={me.username} seed={me.id} mediaId={me.avatar_media_id} src={preview} size="xl" previewOnClick={false} />
              <span className={styles.avatarOverlay}>
                {busy ? <Loader2 size={28} className={styles.spin} /> : <Camera size={28} strokeWidth={1.5} />}
              </span>
            </span>
            <span className={styles.avatarHint}>{t("settings.avatar")}</span>
          </button>
        }
      >
        <DropdownItem icon={<ImageUp size={18} strokeWidth={1.75} />} label={t("settings.avatarUpload")} onSelect={onUpload} />
        {hasAvatar && (
          <DropdownItem icon={<Trash2 size={18} strokeWidth={1.75} />} label={t("settings.avatarDelete")} danger onSelect={() => void onDelete()} />
        )}
      </Dropdown>
      {error && <span className={styles.error}>{error}</span>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFile} />
      {cropSrc && <AvatarCropModal imageSrc={cropSrc} onConfirm={(file) => void onCropConfirm(file)} onCancel={onCropCancel} />}
    </div>
  );
}

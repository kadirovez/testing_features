import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { mediaApi } from "../../../api/media";
import { usersApi } from "../../../api/users";
import { useLocale } from "../../../context/LocaleContext";
import { useStore } from "../../../context/StoreContext";
import { Avatar } from "../../shared/Avatar";
import styles from "./settings.module.css";

export function AvatarPicker() {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = state.users.me;

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setError(null);
    setBusy(true);
    try {
      const media = await mediaApi.upload(file, "avatar");
      dispatch({ type: "users/me", user: await usersApi.setAvatar(media.id) });
    } catch (err) {
      // ApiError for backend rejections, plain Error for a failed storage upload.
      if (!(err instanceof Error)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!me) return null;

  return (
    <div className={styles.avatarBlock}>
      <button type="button" className={styles.avatarButton} onClick={() => inputRef.current?.click()} disabled={busy}>
        <Avatar name={me.display_name} seed={me.id} mediaId={me.avatar_media_id} src={preview} size="xl" />
        <span className={styles.avatarOverlay}>
          {busy ? <Loader2 size={28} className={styles.spin} /> : <Camera size={28} strokeWidth={1.5} />}
        </span>
      </button>
      <span className={styles.avatarHint}>{t("settings.avatar")}</span>
      {error && <span className={styles.error}>{error}</span>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => void onFile(e)} />
    </div>
  );
}

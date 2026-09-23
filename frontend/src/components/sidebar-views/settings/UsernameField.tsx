import { Check } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../../api/client";
import { usersApi } from "../../../api/users";
import { useLocale } from "../../../context/LocaleContext";
import { useStore } from "../../../context/StoreContext";
import { cx } from "../../../utils/cx";
import styles from "./settings.module.css";

const MAX_LENGTH = 32;
const USERNAME_RE = /^[A-Za-z0-9_]{3,32}$/;

export function UsernameField() {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const current = state.users.me?.username ?? "";
  const [value, setValue] = useState(current);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setValue(current), [current]);

  const trimmed = value.trim().replace(/^@+/, "");
  const dirty = trimmed.length > 0 && trimmed.toLowerCase() !== current.toLowerCase();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty) return;
    if (!USERNAME_RE.test(trimmed)) {
      setError(t("settings.usernameInvalid"));
      return;
    }
    setError(null);
    try {
      dispatch({ type: "users/me", user: await usersApi.updateMe({ username: trimmed }) });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      setError(err.message);
    }
  };

  return (
    <form className={styles.field} onSubmit={(e) => void onSubmit(e)}>
      <label className={styles.inputWrap}>
        <span className={styles.floatLabel}>{t("settings.username")}</span>
        <input
          className={styles.input}
          value={value}
          maxLength={MAX_LENGTH}
          autoComplete="username"
          spellCheck={false}
          onChange={(e) => setValue(e.target.value.replace(/^@+/, ""))}
        />
      </label>
      <span className={cx(styles.hint, error && styles.error)}>{error ?? t("settings.usernameHint")}</span>
      <button type="submit" className={cx(styles.save, (dirty || saved) && styles.saveVisible)} disabled={!dirty}>
        {saved ? <Check size={18} strokeWidth={2} /> : null}
        {saved ? t("common.saved") : t("common.save")}
      </button>
    </form>
  );
}

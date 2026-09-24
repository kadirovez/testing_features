import { Eye, EyeOff, MessagesSquare } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import type { TranslationKey } from "../../i18n";
import styles from "./AuthScreen.module.css";

type Mode = "signIn" | "signUp";
type FieldName = "email" | "password" | "username" | "display_name";

const FIELDS: Record<Mode, Array<{ name: FieldName; label: TranslationKey; type: string; autoComplete: string }>> = {
  signIn: [
    { name: "email", label: "auth.email", type: "email", autoComplete: "email" },
    { name: "password", label: "auth.password", type: "password", autoComplete: "current-password" },
  ],
  signUp: [
    { name: "display_name", label: "auth.displayName", type: "text", autoComplete: "name" },
    { name: "username", label: "auth.username", type: "text", autoComplete: "username" },
    { name: "email", label: "auth.email", type: "email", autoComplete: "email" },
    { name: "password", label: "auth.password", type: "password", autoComplete: "new-password" },
  ],
};

export function AuthScreen() {
  const { t } = useLocale();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [values, setValues] = useState<Record<FieldName, string>>({ email: "", password: "", username: "", display_name: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signIn") await login({ email: values.email, password: values.password });
      else await register(values);
    } catch (err) {
      // ApiError from the backend, TypeError when the network is unreachable.
      if (!(err instanceof ApiError || err instanceof TypeError)) throw err;
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.screen}>
      <form className={styles.card} onSubmit={(e) => void onSubmit(e)}>
        <span className={styles.logo}>
          <MessagesSquare size={36} strokeWidth={1.5} />
        </span>
        <h1 className={styles.title}>{mode === "signIn" ? t("auth.signIn") : t("auth.signUp")}</h1>
        <p className={styles.tagline}>{t("auth.tagline")}</p>
        {FIELDS[mode].map(({ name, label, type, autoComplete }) => {
          const isPassword = name === "password";
          const inputType = isPassword && passwordVisible ? "text" : type;

          return (
            <label key={name} className={styles.field}>
              <span className={styles.label}>{t(label)}</span>
              <div className={isPassword ? styles.inputWrap : undefined}>
                <input
                  className={isPassword ? styles.inputWithToggle : styles.input}
                  type={inputType}
                  required
                  autoComplete={autoComplete}
                  minLength={name === "password" && mode === "signUp" ? 8 : undefined}
                  value={values[name]}
                  onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
                />
                {isPassword && (
                  <button
                    type="button"
                    className={styles.visibilityToggle}
                    aria-label={passwordVisible ? t("auth.hidePassword") : t("auth.showPassword")}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((v) => !v)}
                  >
                    {passwordVisible ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
                  </button>
                )}
              </div>
            </label>
          );
        })}
        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.submit} disabled={busy}>
          {mode === "signIn" ? t("auth.submitSignIn") : t("auth.submitSignUp")}
        </button>
        <button type="button" className={styles.switch} onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}>
          {mode === "signIn" ? t("auth.toSignUp") : t("auth.toSignIn")}
        </button>
      </form>
    </div>
  );
}

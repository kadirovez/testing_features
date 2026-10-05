import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import type { TranslationKey } from "../../i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    <div className="flex min-h-[var(--app-height,100dvh)] items-center justify-center overflow-y-auto bg-background p-4">
      <form
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-6 shadow-elev-2 sm:p-8"
        onSubmit={(e) => void onSubmit(e)}
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            {mode === "signIn" ? t("auth.signIn") : t("auth.signUp")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("auth.tagline")}</p>
        </div>
        <Tabs
          value={mode}
          onValueChange={(value) => {
            setMode(value === "signUp" ? "signUp" : "signIn");
            setError(null);
          }}
        >
          <TabsList className="w-full">
            <TabsTrigger value="signIn">{t("auth.signIn")}</TabsTrigger>
            <TabsTrigger value="signUp">{t("auth.signUp")}</TabsTrigger>
          </TabsList>
        </Tabs>
        {FIELDS[mode].map(({ name, label, type, autoComplete }) => {
          const isPassword = name === "password";
          const inputType = isPassword && passwordVisible ? "text" : type;
          const id = `auth-${name}`;

          return (
            <div key={name} className="flex flex-col gap-1.5">
              <Label htmlFor={id}>{t(label)}</Label>
              <div className="relative">
                <Input
                  id={id}
                  className={isPassword ? "h-10 pr-10" : "h-10"}
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
                    className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                    aria-label={passwordVisible ? t("auth.hidePassword") : t("auth.showPassword")}
                    aria-pressed={passwordVisible}
                    onClick={() => setPasswordVisible((v) => !v)}
                  >
                    {passwordVisible ? (
                      <EyeOff className="size-[18px]" strokeWidth={1.75} />
                    ) : (
                      <Eye className="size-[18px]" strokeWidth={1.75} />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {error && (
          <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" className="h-10 w-full" disabled={busy}>
          {mode === "signIn" ? t("auth.submitSignIn") : t("auth.submitSignUp")}
        </Button>
        <Button
          variant="link"
          className="h-auto self-center p-0 text-[13px]"
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
        >
          {mode === "signIn" ? t("auth.toSignUp") : t("auth.toSignIn")}
        </Button>
      </form>
    </div>
  );
}

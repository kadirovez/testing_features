import { Check } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { ApiError } from "../../../api/client";
import { usersApi } from "../../../api/users";
import { useLocale } from "../../../context/LocaleContext";
import { useStore } from "../../../context/StoreContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form className="flex flex-col gap-1.5" onSubmit={(e) => void onSubmit(e)}>
      <Label htmlFor="settings-username">{t("settings.username")}</Label>
      <div className="flex gap-2">
        <Input
          id="settings-username"
          value={value}
          maxLength={MAX_LENGTH}
          autoComplete="username"
          spellCheck={false}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby="settings-username-hint"
          onChange={(e) => setValue(e.target.value.replace(/^@+/, ""))}
        />
        {(dirty || saved) && (
          <Button type="submit" className="animate-in fade-in-0 zoom-in-95 duration-150" disabled={!dirty}>
            {saved && <Check strokeWidth={2} />}
            {saved ? t("common.saved") : t("common.save")}
          </Button>
        )}
      </div>
      <span id="settings-username-hint" className={cn("text-xs", error ? "text-destructive" : "text-muted-foreground")}>
        {error ?? t("settings.usernameHint")}
      </span>
    </form>
  );
}

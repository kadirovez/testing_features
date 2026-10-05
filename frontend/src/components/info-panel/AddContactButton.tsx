import { ApiError } from "../../api/client";
import { usersApi } from "../../api/users";
import type { UUID } from "../../api/types";
import { Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { cn } from "@/lib/utils";

const SUCCESS_HOLD_MS = 420;
const EXIT_MS = 220;

type Phase = "plus" | "pending" | "success" | "exit";

interface AddContactButtonProps {
  userId: UUID;
  visible: boolean;
  onAdded: () => void;
}

export function AddContactButton({ userId, visible, onAdded }: AddContactButtonProps) {
  const { t } = useLocale();
  const { dispatch } = useStore();
  const [phase, setPhase] = useState<Phase>("plus");
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };

  const schedule = (fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timers.current.push(id);
  };

  useEffect(() => {
    clearTimers();
    setPhase("plus");
  }, [userId]);

  useEffect(() => () => clearTimers(), []);

  useEffect(() => {
    if (visible) setPhase("plus");
  }, [visible]);

  if (!visible && phase === "plus") return null;

  const onClick = () => {
    if (phase !== "plus") return;
    setPhase("pending");
    clearTimers();
    void usersApi
      .addContact(userId)
      .then((contact) => {
        dispatch({ type: "users/known", users: [contact.user] });
        setPhase("success");
        schedule(() => setPhase("exit"), SUCCESS_HOLD_MS);
        schedule(() => {
          onAdded();
          setPhase("plus");
        }, SUCCESS_HOLD_MS + EXIT_MS);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.code === "contact_already_exists") {
          setPhase("success");
          schedule(() => setPhase("exit"), SUCCESS_HOLD_MS);
          schedule(() => {
            onAdded();
            setPhase("plus");
          }, SUCCESS_HOLD_MS + EXIT_MS);
          return;
        }
        setPhase("plus");
      });
  };

  const show = visible || phase === "success" || phase === "exit";
  if (!show) return null;

  const label =
    phase === "success" || phase === "exit" ? t("info.contactAdded") : t("info.addContact");

  const checked = phase === "success" || phase === "exit";

  return (
    <button
      type="button"
      className={cn(
        "relative size-10 shrink-0 rounded-full text-primary transition-[opacity,transform,background-color] duration-150 hover:enabled:bg-accent active:enabled:scale-95 disabled:cursor-default",
        phase === "pending" && "opacity-55",
        checked && "text-online",
        phase === "exit" && "pointer-events-none scale-75 opacity-0",
      )}
      aria-label={label}
      title={label}
      disabled={phase !== "plus"}
      onClick={onClick}
    >
      <span
        className={cn(
          "absolute inset-0 grid place-items-center transition-[opacity,transform] duration-200",
          checked ? "scale-50 rotate-45 opacity-0" : "scale-100 opacity-100",
        )}
        aria-hidden
      >
        <Plus className="size-[18px]" strokeWidth={2} />
      </span>
      <span
        className={cn(
          "absolute inset-0 grid place-items-center transition-[opacity,transform] duration-200",
          checked ? "scale-100 rotate-0 opacity-100" : "scale-50 -rotate-45 opacity-0",
        )}
        aria-hidden
      >
        <Check className="size-[18px]" strokeWidth={2.25} />
      </span>
    </button>
  );
}

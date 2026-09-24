import { ApiError } from "../../api/client";
import { usersApi } from "../../api/users";
import type { UUID } from "../../api/types";
import { Check, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { cx } from "../../utils/cx";
import styles from "./AddContactButton.module.css";

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

  return (
    <button
      type="button"
      className={cx(
        styles.button,
        phase === "success" && styles.success,
        phase === "exit" && styles.exit,
        phase === "pending" && styles.pending,
      )}
      aria-label={label}
      title={label}
      disabled={phase !== "plus"}
      onClick={onClick}
    >
      <span className={cx(styles.icon, styles.plus)} aria-hidden>
        <Plus size={18} strokeWidth={2} />
      </span>
      <span className={cx(styles.icon, styles.check)} aria-hidden>
        <Check size={18} strokeWidth={2.25} />
      </span>
    </button>
  );
}

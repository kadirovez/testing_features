import { AtSign, Info, Mail } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { Avatar } from "../shared/Avatar";
import { InfoRow } from "../shared/InfoRow";
import { ViewHeader } from "./ViewHeader";

export function ProfileView() {
  const { state } = useStore();
  const { t } = useLocale();
  const me = state.users.me;
  if (!me) return null;

  return (
    <>
      <ViewHeader title={t("profile.title")} />
      <div className="min-h-0 flex-1 overflow-y-auto pb-6">
        <div className="flex flex-col items-center gap-1 px-4 pt-6 pb-5 text-center">
          <Avatar name={me.username} seed={me.id} mediaId={me.avatar_media_id} size="xl" />
          <h3 className="mt-3 max-w-full truncate text-lg font-semibold">{me.username}</h3>
          <span className="text-sm text-primary">{t("chat.online")}</span>
        </div>
        <div className="flex flex-col gap-1 border-t px-2 py-2">
          <InfoRow icon={AtSign} value={`@${me.username}`} label={t("info.username")} />
          <InfoRow icon={Mail} value={me.email} label={t("profile.email")} />
          {me.bio && <InfoRow icon={Info} value={me.bio} label={t("info.bio")} />}
        </div>
      </div>
    </>
  );
}

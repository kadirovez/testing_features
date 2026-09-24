import { AtSign, ChevronLeft, Info, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { chatsApi } from "../../api/chats";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useChatMeta } from "../../hooks/useChatMeta";
import { useIsContact } from "../../hooks/useIsContact";
import type { UUID } from "../../api/types";
import { InfoRow } from "../shared/InfoRow";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";
import styles from "./InfoPanel.module.css";
import { AddContactButton } from "./AddContactButton";
import { GroupAvatarPicker } from "./GroupAvatarPicker";
import { GroupMembersList } from "./GroupMembersList";
import { InfoMemberProfile } from "./InfoMemberProfile";
import { InfoTabs } from "./InfoTabs";

export function InfoPanel() {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const [memberProfileId, setMemberProfileId] = useState<UUID | null>(null);
  // Keep showing the last chat while the panel slides out.
  const lastChatId = useRef(state.ui.activeChatId);
  if (state.ui.activeChatId) lastChatId.current = state.ui.activeChatId;
  const meta = useChatMeta(lastChatId.current);
  const peerId = meta?.chat.type === "direct" ? meta.peer?.id ?? null : null;
  const { isContact, markContact } = useIsContact(peerId);

  useEffect(() => {
    setMemberProfileId(null);
  }, [meta?.chat.id]);

  useEffect(() => {
    if (!meta || meta.chat.type !== "group") return;
    if (state.users.members[meta.chat.id]) return;
    void chatsApi.members(meta.chat.id).then((members) => {
      dispatch({ type: "users/members", chatId: meta.chat.id, members });
    });
  }, [dispatch, meta?.chat.id, meta?.chat.type]);

  const timeline = meta ? state.messages.byChat[meta.chat.id] : undefined;
  const messages = useMemo(
    () => (timeline?.ids ?? []).map((id) => state.messages.byId[id]).filter((m) => !m.is_deleted),
    [timeline?.ids, state.messages.byId],
  );

  if (!meta) return null;
  const about = meta.chat.type === "group" ? meta.chat.description : meta.peer?.bio;
  const memberTitle =
    memberProfileId && state.users.byId[memberProfileId]
      ? state.users.byId[memberProfileId].display_name
      : t("info.title");

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        {memberProfileId ? (
          <IconButton label={t("common.back")} onClick={() => setMemberProfileId(null)}>
            <ChevronLeft size={20} strokeWidth={1.75} />
          </IconButton>
        ) : (
          <IconButton label={t("common.close")} onClick={() => dispatch({ type: "ui/setInfoOpen", open: false })}>
            <X size={20} strokeWidth={1.75} />
          </IconButton>
        )}
        <h2 className={styles.heading}>{memberTitle}</h2>
      </header>
      <div className={styles.scroll}>
        {memberProfileId ? (
          <InfoMemberProfile userId={memberProfileId} />
        ) : (
          <>
            <div className={styles.hero}>
              {meta.chat.type === "group" ? (
                <GroupAvatarPicker
                  chatId={meta.chat.id}
                  name={meta.title}
                  seed={meta.avatarSeed}
                  mediaId={meta.avatarMediaId}
                />
              ) : (
                <Avatar
                  name={meta.title}
                  seed={meta.avatarSeed}
                  mediaId={meta.avatarMediaId}
                  size="xl"
                  online={meta.online}
                />
              )}
              <h3 className={styles.name}>{meta.title}</h3>
              <span className={styles.status}>{meta.subtitle}</span>
            </div>
            <div className={styles.details}>
              {meta.peer && (
                <div className={styles.usernameRow}>
                  <div className={styles.usernameRowMain}>
                    <InfoRow icon={AtSign} value={`@${meta.peer.username}`} label={t("info.username")} />
                  </div>
                  <AddContactButton userId={meta.peer.id} visible={isContact === false} onAdded={markContact} />
                </div>
              )}
              {about && (
                <InfoRow
                  icon={Info}
                  value={about}
                  label={meta.chat.type === "group" ? t("info.description") : t("info.bio")}
                />
              )}
            </div>
            {meta.chat.type === "group" && (
              <GroupMembersList chatId={meta.chat.id} onSelectMember={setMemberProfileId} />
            )}
            <InfoTabs messages={messages} />
          </>
        )}
      </div>
    </div>
  );
}

import type { MessageRead } from "../api/types";
import { config } from "../config";
import { isSameDay } from "./formatTime";

export interface MessageGroup {
  key: string;
  senderId: string | null;
  isSystem: boolean;
  messages: MessageRead[];
}

export interface DaySection {
  key: string;
  date: string;
  groups: MessageGroup[];
}

function continuesGroup(group: MessageGroup, message: MessageRead): boolean {
  const last = group.messages[group.messages.length - 1];
  const gap = new Date(message.created_at).getTime() - new Date(last.created_at).getTime();
  return (
    !group.isSystem &&
    message.type !== "system" &&
    group.senderId === message.sender_id &&
    gap < config.messageGroupWindowMs
  );
}

/** Splits a chronological timeline into day sections of consecutive same-sender groups. */
export function groupMessages(messages: MessageRead[]): DaySection[] {
  const sections: DaySection[] = [];
  for (const message of messages) {
    let section = sections[sections.length - 1];
    if (!section || !isSameDay(section.date, message.created_at)) {
      section = { key: message.id, date: message.created_at, groups: [] };
      sections.push(section);
    }
    const group = section.groups[section.groups.length - 1];
    if (group && continuesGroup(group, message)) {
      group.messages.push(message);
    } else {
      section.groups.push({
        key: message.id,
        senderId: message.sender_id,
        isSystem: message.type === "system",
        messages: [message],
      });
    }
  }
  return sections;
}

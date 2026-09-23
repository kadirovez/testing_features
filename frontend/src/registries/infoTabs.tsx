import type { ComponentType } from "react";
import type { MessageRead } from "../api/types";
import { FileList } from "../components/info-panel/FileList";
import { LinkList } from "../components/info-panel/LinkList";
import { MediaGrid } from "../components/info-panel/MediaGrid";
import type { TranslationKey } from "../i18n";

export interface InfoTabProps {
  messages: MessageRead[];
}

export interface InfoTabEntry {
  id: string;
  labelKey: TranslationKey;
  component: ComponentType<InfoTabProps>;
}

export const INFO_TABS: InfoTabEntry[] = [
  { id: "media", labelKey: "info.tabMedia", component: MediaGrid },
  { id: "files", labelKey: "info.tabFiles", component: FileList },
  { id: "links", labelKey: "info.tabLinks", component: LinkList },
];

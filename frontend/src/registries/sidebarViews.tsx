import { Settings, UserRound, Users, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { ContactsView } from "../components/sidebar-views/ContactsView";
import { ProfileView } from "../components/sidebar-views/ProfileView";
import { SettingsView } from "../components/sidebar-views/SettingsView";
import type { TranslationKey } from "../i18n";
import type { SidebarViewId } from "../store/uiSlice";

export interface SidebarViewEntry {
  id: Exclude<SidebarViewId, "chats">;
  icon: LucideIcon;
  labelKey: TranslationKey;
  component: ComponentType;
}

/** Order here defines the order in HamburgerMenu. */
export const SIDEBAR_VIEWS: SidebarViewEntry[] = [
  { id: "profile", icon: UserRound, labelKey: "menu.profile", component: ProfileView },
  { id: "contacts", icon: Users, labelKey: "menu.contacts", component: ContactsView },
  { id: "settings", icon: Settings, labelKey: "menu.settings", component: SettingsView },
];

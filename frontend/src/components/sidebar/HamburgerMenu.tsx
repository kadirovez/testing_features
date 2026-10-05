import { LogOut, Menu, Moon, UsersRound } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { useTheme } from "../../context/ThemeContext";
import { SIDEBAR_VIEWS } from "../../registries/sidebarViews";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Avatar } from "../shared/Avatar";
import { IconButton } from "../shared/IconButton";
import { CreateGroupModal } from "./CreateGroupModal";

interface HamburgerMenuProps {
  /** "avatar" is used in the desktop app header, "icon" in the mobile sidebar header. */
  trigger?: "icon" | "avatar";
}

export function HamburgerMenu({ trigger = "icon" }: HamburgerMenuProps) {
  const { state, dispatch } = useStore();
  const { t } = useLocale();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const me = state.users.me;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {trigger === "avatar" && me ? (
            <button
              type="button"
              aria-label={t("menu.account")}
              className="flex items-center gap-2 rounded-full p-0.5 pr-1 transition-colors duration-150 hover:bg-accent outline-none focus-visible:ring-2 focus-visible:ring-ring/40 data-[state=open]:bg-accent"
            >
              <Avatar name={me.display_name} seed={me.id} mediaId={me.avatar_media_id} size="sm" previewOnClick={false} />
            </button>
          ) : (
            <IconButton label={t("menu.open")}>
              <Menu strokeWidth={1.75} />
            </IconButton>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={trigger === "avatar" ? "end" : "start"} className="w-60">
          {me && (
            <>
              <DropdownMenuLabel className="flex flex-col">
                <span className="truncate font-semibold">{me.display_name}</span>
                <span className="truncate text-xs font-normal text-muted-foreground">@{me.username}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
            </>
          )}
          {SIDEBAR_VIEWS.map(({ id, icon: Icon, labelKey }) => (
            <DropdownMenuItem key={id} onSelect={() => dispatch({ type: "ui/setSidebarView", view: id })}>
              <Icon strokeWidth={1.75} />
              {t(labelKey)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => setGroupModalOpen(true)}>
            <UsersRound strokeWidth={1.75} />
            {t("menu.createGroup")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              toggleTheme();
            }}
          >
            <Moon strokeWidth={1.75} />
            <span className="flex-1">{t("settings.darkTheme")}</span>
            <Switch checked={theme === "dark"} tabIndex={-1} aria-hidden className="pointer-events-none" />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => void logout()}>
            <LogOut strokeWidth={1.75} />
            {t("menu.logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreateGroupModal open={groupModalOpen} onClose={() => setGroupModalOpen(false)} />
    </>
  );
}

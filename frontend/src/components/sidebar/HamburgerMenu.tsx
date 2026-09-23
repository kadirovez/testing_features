import { LogOut, Menu } from "lucide-react";
import { useCallback, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocale } from "../../context/LocaleContext";
import { useStore } from "../../context/StoreContext";
import { SIDEBAR_VIEWS } from "../../registries/sidebarViews";
import { Dropdown, DropdownItem } from "../shared/Dropdown";
import { IconButton } from "../shared/IconButton";

export function HamburgerMenu() {
  const { dispatch } = useStore();
  const { t } = useLocale();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <Dropdown
      open={open}
      onClose={close}
      trigger={
        <IconButton label={t("menu.open")} active={open} onClick={() => setOpen((v) => !v)}>
          <Menu size={20} strokeWidth={1.75} />
        </IconButton>
      }
    >
      {SIDEBAR_VIEWS.map(({ id, icon: Icon, labelKey }) => (
        <DropdownItem
          key={id}
          icon={<Icon size={18} strokeWidth={1.75} />}
          label={t(labelKey)}
          onSelect={() => {
            close();
            dispatch({ type: "ui/setSidebarView", view: id });
          }}
        />
      ))}
      <DropdownItem icon={<LogOut size={18} strokeWidth={1.75} />} label={t("menu.logout")} danger onSelect={() => void logout()} />
    </Dropdown>
  );
}

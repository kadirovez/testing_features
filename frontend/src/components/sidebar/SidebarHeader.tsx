import { HamburgerMenu } from "./HamburgerMenu";
import { SearchInput } from "./SearchInput";
import styles from "./SidebarHeader.module.css";

interface SidebarHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function SidebarHeader({ query, onQueryChange }: SidebarHeaderProps) {
  return (
    <header className={styles.header}>
      <HamburgerMenu />
      <SearchInput value={query} onChange={onQueryChange} />
    </header>
  );
}

import { HamburgerMenu } from "./HamburgerMenu";
import { SearchInput } from "./SearchInput";

interface SidebarHeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export function SidebarHeader({ query, onQueryChange }: SidebarHeaderProps) {
  return (
    <header className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
      <HamburgerMenu />
      <div className="min-w-0 flex-1">
        <SearchInput value={query} onChange={onQueryChange} />
      </div>
    </header>
  );
}

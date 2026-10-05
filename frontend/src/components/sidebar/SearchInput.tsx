import { Search, X } from "lucide-react";
import { useLocale } from "../../context/LocaleContext";
import { Input } from "@/components/ui/input";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchInput({ value, onChange }: SearchInputProps) {
  const { t } = useLocale();

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" strokeWidth={1.75} />
      <Input
        type="search"
        value={value}
        aria-label={t("search.placeholder")}
        placeholder={t("search.placeholder")}
        className="h-9 rounded-full border-transparent bg-muted pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden focus-visible:bg-card"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onChange("")}
      />
      {value && (
        <button
          type="button"
          className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={t("common.close")}
          onClick={() => onChange("")}
        >
          <X className="size-3.5" strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

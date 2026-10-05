import type { PointerEventHandler } from "react";

interface SidebarResizeHandleProps {
  active: boolean;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
}

export function SidebarResizeHandle({ active, onPointerDown }: SidebarResizeHandleProps) {
  return (
    <div
      className="group absolute top-0 -right-1 z-[4] h-full w-2 cursor-col-resize touch-none"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      data-active={active || undefined}
      onPointerDown={onPointerDown}
    >
      <span className="absolute inset-y-0 left-[3px] w-0.5 rounded-full bg-primary opacity-0 transition-opacity duration-150 group-hover:opacity-45 group-data-[active]:opacity-45" />
    </div>
  );
}

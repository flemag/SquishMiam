"use client";

import { useRef } from "react";
import type { EntryVue } from "@/lib/drag-repas";

const SLOT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  PETIT_DEJEUNER: { bg: "bg-[#FFF9E6]", border: "border-[#E8D5A3]", text: "text-[#8a6d3b]" },
  DEJEUNER: { bg: "bg-[#A8E6CF]/20", border: "border-[#A8E6CF]", text: "text-[#2e5340]" },
  DINER: { bg: "bg-[#C9B6E4]/20", border: "border-[#C9B6E4]", text: "text-[#43325e]" },
};

export default function CarteRepas({
  entry,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClickEdit,
}: {
  entry: EntryVue;
  isDragging: boolean;
  onDragStart: (e: React.TouchEvent | React.MouseEvent) => void;
  onDragMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onDragEnd: () => void;
  onClickEdit: () => void;
}) {
  const carteRef = useRef<HTMLDivElement>(null);
  const reducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const style = isDragging && !reducedMotion ? {
    transform: "rotate(2deg) scale(1.02)",
    opacity: 0.85,
    zIndex: 50,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  } : {};

  const colors = SLOT_COLORS[entry.slot] ?? SLOT_COLORS.DEJEUNER;

  return (
    <div
      ref={carteRef}
      className={`group relative rounded-xl border-l-4 ${colors.border} ${colors.bg} transition-all duration-150 cursor-pointer hover:shadow-sm ${isDragging ? "cursor-grabbing" : ""}`}
      style={style}
      onClick={onClickEdit}
      onTouchStart={onDragStart}
      onTouchMove={onDragMove}
      onTouchEnd={onDragEnd}
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      {/* Poignée de réordonnancement */}
      <button
        type="button"
        aria-label={`Réordonner ${entry.title}`}
        tabIndex={0}
        className="absolute -left-8 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full text-texte-doux opacity-0 group-hover:opacity-100 hover:bg-[#A8E6CF]/30 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-[#e07a5f] transition-opacity"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDragStart(e as unknown as React.TouchEvent | React.MouseEvent);
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
        </svg>
      </button>

      {/* Contenu */}
      <div className="px-2.5 py-2">
        <p className="text-xs font-semibold leading-tight text-foreground line-clamp-2">{entry.title}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`text-[10px] font-medium ${colors.text}`}>{entry.servings} pers.</span>
        </div>
      </div>
    </div>
  );
}
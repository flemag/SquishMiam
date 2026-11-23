"use client";

import { useRef } from "react";
import type { EntryVue } from "@/lib/drag-repas";

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

  // Styles dynamiques pendant le drag
  const style = isDragging && !reducedMotion ? {
    transform: "rotate(2deg) scale(1.02)",
    opacity: 0.85,
    zIndex: 50,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  } : {};

  return (
    <div
      ref={carteRef}
      className={`carte cursor-grab transition-all duration-150 ${isDragging ? "cursor-grabbing" : ""}`}
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
      {/* Poignée de réordonnancement — toujours visible, zone tactile 44×44 */}
      <button
        type="button"
        aria-label={`Réordonner ${entry.title}`}
        tabIndex={0}
        className="absolute -left-10 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-texte-doux hover:bg-[#A8E6CF]/30 focus-visible:outline-2 focus-visible:outline-[#e07a5f]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDragStart(e as unknown as React.TouchEvent | React.MouseEvent);
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
        </svg>
      </button>

      {/* Contenu de la carte */}
      <div className="ml-8">
        <button type="button" className="w-full text-left p-2" onClick={onClickEdit}>
          <p className="text-sm font-medium leading-tight text-foreground">{entry.title}</p>
          <p className="text-xs text-texte-tres-doux">{entry.servings} portion(s)</p>
        </button>
      </div>
    </div>
  );
}
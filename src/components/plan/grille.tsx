"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CarteRepas from "./carte-repas";
import FeuilleRepas, { type RecetteChoix } from "./feuille-repas";
import type { CategorieVue } from "@/lib/categories";
import { useDragRepas, type EntryVue } from "@/lib/drag-repas";
import { SLOTS, type Slot } from "@/lib/plan";

async function erreurDe(res: Response, defaut: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : defaut;
}

export default function GrillePlan({
  dates,
  slots,
  slotLabels,
  entries,
  recipes,
  categories,
  portionsDefaut = 1,
}: {
  dates: string[];
  slots: Slot[];
  slotLabels: Record<Slot, string>;
  entries: EntryVue[];
  recipes: RecetteChoix[];
  categories: CategorieVue[];
  portionsDefaut?: number;
}) {
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);
  const [feuille, setFeuille] = useState<{ date: string; slot: Slot; entry: EntryVue | null } | null>(null);

  const { dragState, startDrag, moveDrag, endDrag, cancelDrag } = useDragRepas();

  const clesOccupees = new Set(
    entries.filter((e) => e.id !== feuille?.entry?.id).map((e) => `${e.date.slice(0, 10)}|${e.slot}`)
  );

  const getClientCoords = (e: React.TouchEvent | React.MouseEvent): { x: number; y: number } => {
    if ("touches" in e) {
      return { x: e.touches[0]?.clientX ?? 0, y: e.touches[0]?.clientY ?? 0 };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent, entry: EntryVue) => {
    const { x, y } = getClientCoords(e);
    startDrag(entry.id, x, y, entry, entries, dates, slots);
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    const { x, y } = getClientCoords(e);
    moveDrag(x, y);
  };

  const handleDragEnd = async () => {
    const result = await endDrag();
    if (result) {
      const entryId = dragState?.entryId;
      if (entryId) {
        try {
          const res = await fetch(`/api/plan/${entryId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: result.date.slice(0, 10),
              slot: result.slot,
              order: result.order,
            }),
          });
          if (res.ok) {
            router.refresh();
          } else {
            setErreur(await erreurDe(res, "Déplacement impossible — réessaie."));
          }
        } catch {
          setErreur("Déplacement impossible — réessaie.");
        }
      }
    }
    cancelDrag();
  };

  const entriesInCell = (date: string, slot: Slot) =>
    entries
      .filter((e) => e.date.slice(0, 10) === date.slice(0, 10) && e.slot === slot)
      .sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="carte mb-4 flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-texte-doux">
          Glisse une recette d&apos;une case à l&apos;autre, ou clique sur + pour remplir.
        </span>
        {erreur && (
          <span role="status" aria-live="polite" className="text-sm text-danger">
            {erreur}
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-2 -mx-4 px-4">
        <div className="grid min-w-[720px] grid-cols-7 gap-2" aria-busy={dragState !== null}>
          {dates.map((date) => (
            <div key={date} className="text-center text-xs font-medium text-texte-doux pb-1">
              {new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
                new Date(date)
              )}
            </div>
          ))}
          {slots.map((slot) =>
            dates.map((date) => {
              const cellEntries = entriesInCell(date, slot);
              return (
                <div
                  key={`${date}-${slot}`}
                  className={`min-h-[100px] p-1.5 transition ${
                    cellEntries.length > 0 ? "carte" : "rounded-2xl border border-dashed border-[#A8E6CF] bg-white/50"
                  }`}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-[#8fb5a2]">{slotLabels[slot]}</div>
                  {cellEntries.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {cellEntries.map((entry) => (
                        <CarteRepas
                          key={entry.id}
                          entry={entry}
                          isDragging={dragState?.entryId === entry.id}
                          onDragStart={(e) => handleDragStart(e, entry)}
                          onDragMove={handleDragMove}
                          onDragEnd={handleDragEnd}
                          onClickEdit={() => setFeuille({ date, slot, entry })}
                        />
                      ))}
                      {/* Bouton + toujours visible pour ajouter un autre repas */}
                      <button
                        type="button"
                        onClick={() => setFeuille({ date, slot, entry: null })}
                        className="flex h-7 w-full items-center justify-center rounded-lg border border-dashed border-[#A8E6CF]/60 text-xs text-[#4A6741]/50 hover:bg-[#A8E6CF]/20 hover:text-[#4A6741] transition"
                        aria-label={`Ajouter un autre repas — ${slotLabels[slot] ?? slot}`}
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFeuille({ date, slot, entry: null })}
                      className="flex h-16 w-full items-center justify-center rounded-xl text-2xl text-[#4A6741]/30 hover:bg-[#A8E6CF]/20 hover:text-[#4A6741] transition"
                      title="Ajouter un repas"
                      aria-label={`Ajouter un repas — ${slotLabels[slot] ?? slot}`}
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {feuille && (
        <FeuilleRepas
          cible={{ date: feuille.date, slot: feuille.slot }}
          entry={feuille.entry}
          recipes={recipes}
          categories={categories}
          clesOccupees={clesOccupees}
          dates={dates}
          slots={slots}
          slotLabels={slotLabels}
          portionsDefaut={portionsDefaut}
          onFermer={() => setFeuille(null)}
        />
      )}
    </div>
  );
}
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FeuilleRepas, { type RecetteChoix } from "./feuille-repas";

export type EntryVue = {
  id: string;
  date: string;
  slot: string;
  servings: number;
  recipeId: string;
  title: string;
};

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
}: {
  dates: string[];
  slots: string[];
  slotLabels: Record<string, string>;
  entries: EntryVue[];
  recipes: RecetteChoix[];
}) {
  const router = useRouter();
  const [glisse, setGlisse] = useState<string | null>(null);
  // Un seul déplacement à la fois : la clé identifie le repas en cours de PATCH.
  const [pending, setPending] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [feuille, setFeuille] = useState<{ date: string; slot: string; entry: EntryVue | null } | null>(null);

  function entryDe(date: string, slot: string): EntryVue | undefined {
    return entries.find((e) => e.date.slice(0, 10) === date.slice(0, 10) && e.slot === slot);
  }

  // Glisser-déposer (bonus desktop) = une modification : aucun événement Miamz.
  async function deplacer(entryId: string, date: string, slot: string) {
    // Ignore un second drop tant que le PATCH précédent est en vol.
    if (pending !== null) return;
    setPending(entryId);
    setGlisse(null);
    setErreur(null);
    try {
      const res = await fetch(`/api/plan/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: date.slice(0, 10), slot }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        setErreur(await erreurDe(res, "Déplacement impossible — réessaie."));
      }
    } catch {
      setErreur("Déplacement impossible — réessaie.");
    } finally {
      setPending(null);
    }
  }

  // Toutes les cases occupées sauf celle du repas en édition (sa position
  // actuelle reste sélectionnable : no-op).
  const clesOccupees = new Set(
    entries.filter((e) => e.id !== feuille?.entry?.id).map((e) => `${e.date.slice(0, 10)}|${e.slot}`)
  );

  return (
    <div>
      <div className="carte mb-4 flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm text-texte-doux">
          {pending !== null
            ? "Déplacement…"
            : "Glisse une recette d'une case à l'autre, ou clique sur + pour remplir."}
        </span>
        {erreur && (
          <span role="status" aria-live="polite" className="text-sm text-danger">
            {erreur}
          </span>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[760px] grid-cols-7 gap-2" aria-busy={pending !== null}>
          {dates.map((date) => (
            <div key={date} className="text-center text-xs font-medium text-texte-doux">
              {new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(
                new Date(date)
              )}
            </div>
          ))}
          {slots.map((slot) =>
            dates.map((date) => {
              const entry = entryDe(date, slot);
              return (
                <div
                  key={`${date}-${slot}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => pending === null && glisse && deplacer(glisse, date, slot)}
                  className={`min-h-28 p-2 transition ${
                    entry ? "carte" : "rounded-2xl border border-dashed border-[#A8E6CF] bg-white/50"
                  }`}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-[#8fb5a2]">{slotLabels[slot]}</div>
                  {entry ? (
                    <div
                      draggable
                      onDragStart={() => setGlisse(entry.id)}
                      onDragEnd={() => setGlisse(null)}
                      className="cursor-grab"
                    >
                      <button type="button" onClick={() => setFeuille({ date, slot, entry })} className="w-full text-left">
                        <p className="text-sm font-medium leading-tight text-foreground">{entry.title}</p>
                        <p className="text-xs text-texte-tres-doux">{entry.servings} portion(s)</p>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFeuille({ date, slot, entry: null })}
                      className="flex h-16 w-full items-center justify-center rounded-xl text-xl text-[#4A6741]/40 hover:bg-[#A8E6CF]/20"
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
          clesOccupees={clesOccupees}
          dates={dates}
          slots={slots}
          slotLabels={slotLabels}
          onFermer={() => setFeuille(null)}
        />
      )}
    </div>
  );
}

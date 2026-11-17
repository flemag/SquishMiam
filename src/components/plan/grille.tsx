"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMiamz } from "@/components/miamz/fournisseur";

type EntryVue = {
  id: string;
  date: string;
  slot: string;
  servings: number;
  recipeId: string;
  title: string;
};

type RecetteChoix = { id: string; title: string };

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
  const { emettre } = useMiamz();
  const [caseActive, setCaseActive] = useState<{ date: string; slot: string } | null>(null);
  const [recetteChoisie, setRecetteChoisie] = useState(recipes[0]?.id ?? "");
  const [servings, setServings] = useState(2);
  const [glisse, setGlisse] = useState<string | null>(null);

  function entryDe(date: string, slot: string): EntryVue | undefined {
    return entries.find((e) => e.date.slice(0, 10) === date.slice(0, 10) && e.slot === slot);
  }

  async function ajouter(date: string, slot: string) {
    if (!recetteChoisie) return;
    const res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: date.slice(0, 10), slot, recipeId: recetteChoisie, servings }),
    });
    if (res.ok) emettre("repas-planifie");
    setCaseActive(null);
    router.refresh();
  }

  async function deplacer(entryId: string, date: string, slot: string) {
    await fetch(`/api/plan/${entryId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: date.slice(0, 10), slot }),
    });
    setGlisse(null);
    router.refresh();
  }

  async function supprimer(entryId: string) {
    const res = await fetch(`/api/plan/${entryId}`, { method: "DELETE" });
    if (res.ok) emettre("repas-retire");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-3xl bg-white p-4 shadow-sm">
        <span className="text-sm text-gray-500">Glisse une recette d&apos;une case à l&apos;autre, ou clique sur + pour remplir.</span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {dates.map((date) => (
            <div key={date} className="text-center text-xs font-medium text-gray-500">
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
                  onDrop={() => glisse && deplacer(glisse, date, slot)}
                  className={`min-h-28 rounded-2xl border p-2 transition ${
                    entry ? "bg-white border-transparent shadow-sm" : "border-dashed border-[#A8E6CF] bg-white/50"
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
                      <p className="text-sm font-medium leading-tight text-gray-800">{entry.title}</p>
                      <p className="text-xs text-gray-400">{entry.servings} portion(s)</p>
                      <button
                        onClick={() => supprimer(entry.id)}
                        className="mt-1 text-[10px] text-[#B0413E]/60 hover:text-[#B0413E]"
                      >
                        retirer
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCaseActive({ date, slot })}
                      className="flex h-16 w-full items-center justify-center rounded-xl text-xl text-[#4A6741]/40 hover:bg-[#A8E6CF]/20"
                      title="Ajouter un repas"
                    >
                      +
                    </button>
                  )}

                  {caseActive && caseActive.date === date && caseActive.slot === slot && (
                    <div className="mt-1 flex flex-col gap-1 rounded-xl bg-[#FFF9E6] p-2">
                      <select
                        value={recetteChoisie}
                        onChange={(e) => setRecetteChoisie(e.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={servings}
                        onChange={(e) => setServings(Number(e.target.value))}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs"
                        title="Portions"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => ajouter(date, slot)}
                          className="flex-1 rounded-lg bg-[#4A6741] px-2 py-1 text-xs text-white"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setCaseActive(null)}
                          className="flex-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-500"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

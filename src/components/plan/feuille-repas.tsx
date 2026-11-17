"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMiamz } from "@/components/miamz/fournisseur";
import { filtrerRecettes, nomsIngredients } from "@/lib/recherche-recettes";
import FeuilleModale from "@/components/ui/feuille-modale";

export type RecetteChoix = { id: string; title: string; minutes: number | null; ingredients: unknown };
export type EntryVue = { id: string; date: string; slot: string; servings: number; recipeId: string; title: string };

const labelJour = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", timeZone: "UTC" }).format(new Date(date));

/**
 * Bottom sheet universelle du Plan : créer, modifier (portions, recette,
 * déplacement) ou supprimer un repas — tout au doigt. Règles du plan 2c :
 * seuls la création et la suppression émettent un événement Miamz (jamais
 * la modification), et jamais d'écrasement silencieux d'une case occupée
 * (cibles désactivées + « — occupé », 409 défensif).
 */
export default function FeuilleRepas({
  cible,
  entry,
  recipes,
  clesOccupees,
  dates,
  slots,
  slotLabels,
  onFermer,
}: {
  cible: { date: string; slot: string };
  entry: EntryVue | null;
  recipes: RecetteChoix[];
  clesOccupees: Set<string>;
  dates: string[];
  slots: string[];
  slotLabels: Record<string, string>;
  onFermer: () => void;
}) {
  const router = useRouter();
  const { emettre } = useMiamz();
  const [requete, setRequete] = useState(entry?.title ?? "");
  const [recetteChoisie, setRecetteChoisie] = useState(entry?.recipeId ?? recipes[0]?.id ?? "");
  const [servings, setServings] = useState(entry?.servings ?? 2);
  const [jour, setJour] = useState(cible.date);
  const [service, setService] = useState(cible.slot);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const edition = entry !== null;
  const deplace = jour !== cible.date || service !== cible.slot;

  const recettesRecherchables = recipes.map((r) => ({
    ...r,
    tags: [] as string[],
    ingredientNoms: nomsIngredients(r.ingredients),
  }));
  const visibles = filtrerRecettes(recettesRecherchables, { requete, tags: [], dureeMax: null });

  function changeServings(v: number) {
    setServings(Math.min(12, Math.max(1, v)));
  }

  async function ajouter() {
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: jour.slice(0, 10), slot: service, recipeId: recetteChoisie, servings }),
      });
      if (res.ok) {
        emettre("repas-planifie");
        onFermer();
        router.refresh();
      } else if (res.status === 409) {
        setErreur("Une case occupe déjà ce créneau");
      } else {
        setErreur("Ajout impossible — réessaie.");
      }
    } finally {
      setEnCours(false);
    }
  }

  async function enregistrer() {
    if (!entry) return;
    setEnCours(true);
    setErreur(null);
    try {
      // Uniquement les champs changés ; une modification n'émet JAMAIS d'événement.
      const data: { servings?: number; recipeId?: string; date?: string; slot?: string } = {};
      if (servings !== entry.servings) data.servings = servings;
      if (recetteChoisie !== entry.recipeId) data.recipeId = recetteChoisie;
      if (deplace) {
        data.date = jour.slice(0, 10);
        data.slot = service;
      }
      const res = await fetch(`/api/plan/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        onFermer();
        router.refresh();
      } else if (res.status === 409) {
        setErreur("Une case occupe déjà ce créneau");
      } else {
        setErreur("Enregistrement impossible — réessaie.");
      }
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer() {
    if (!entry) return;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/plan/${entry.id}`, { method: "DELETE" });
      if (res.ok) {
        emettre("repas-retire");
        onFermer();
        router.refresh();
      } else {
        setErreur("Suppression impossible — réessaie.");
      }
    } finally {
      setEnCours(false);
    }
  }

  return (
    <FeuilleModale
      ouvert
      onFermer={onFermer}
      titre={`${labelJour(jour)} · ${slotLabels[service] ?? service}`}
      footer={
        edition ? (
          <>
            <button type="button" onClick={enregistrer} disabled={enCours} className="bouton min-h-11 flex-1">
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={supprimer} disabled={enCours} className="bouton-danger min-h-11">
              Supprimer
            </button>
          </>
        ) : (
          <button type="button" onClick={ajouter} disabled={enCours || !recetteChoisie} className="bouton min-h-11 flex-1">
            {enCours ? "Ajout…" : "Ajouter au planning"}
          </button>
        )
      }
    >
      <p className="text-sm text-texte-doux">{edition ? "Modifier le repas" : "Nouveau repas"}</p>
      {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-foreground">Recette</h3>
        <input
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          placeholder="Filtrer les recettes…"
          aria-label="Filtrer les recettes"
          className="champ mt-2 w-full"
        />
        <div className="mt-2 flex flex-col gap-1">
          {visibles.length === 0 ? (
            <p className="text-sm text-texte-doux">Aucune recette ne correspond.</p>
          ) : (
            visibles.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRecetteChoisie(r.id)}
                aria-pressed={recetteChoisie === r.id}
                className={`min-h-11 w-full rounded-xl px-3 text-left text-sm font-medium transition ${
                  recetteChoisie === r.id ? "bg-[#A8E6CF]/40" : "hover:bg-[#A8E6CF]/20"
                }`}
              >
                {r.title}
                {r.minutes ? <span className="text-texte-doux"> · {r.minutes} min</span> : null}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Portions</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => changeServings(servings - 1)}
            disabled={servings <= 1 || enCours}
            aria-label="Moins de portions"
            className="bouton-secondaire h-11 w-11 px-0"
          >
            −
          </button>
          <span className="min-w-6 text-center font-semibold">{servings}</span>
          <button
            type="button"
            onClick={() => changeServings(servings + 1)}
            disabled={servings >= 12 || enCours}
            aria-label="Plus de portions"
            className="bouton-secondaire h-11 w-11 px-0"
          >
            +
          </button>
        </div>
      </div>

      {edition && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-foreground">Déplacer vers</h3>
          <div className="mt-2 flex gap-2">
            <select
              value={jour}
              onChange={(e) => setJour(e.target.value)}
              aria-label="Nouveau jour"
              className="champ min-h-11 min-w-0 flex-1"
            >
              {dates.map((d) => {
                const occupe = clesOccupees.has(`${d.slice(0, 10)}|${service}`);
                return (
                  <option key={d} value={d} disabled={occupe}>
                    {labelJour(d)}
                    {occupe ? " — occupé" : ""}
                  </option>
                );
              })}
            </select>
            <select
              value={service}
              onChange={(e) => setService(e.target.value)}
              aria-label="Nouveau service"
              className="champ min-h-11 min-w-0 flex-1"
            >
              {slots.map((s) => {
                const occupe = clesOccupees.has(`${jour.slice(0, 10)}|${s}`);
                return (
                  <option key={s} value={s} disabled={occupe}>
                    {slotLabels[s] ?? s}
                    {occupe ? " — occupé" : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}
    </FeuilleModale>
  );
}

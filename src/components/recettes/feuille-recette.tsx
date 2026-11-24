"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FeuilleModale from "@/components/ui/feuille-modale";
import { useMiamz } from "@/components/miamz/fournisseur";
import { formatDateIso, formatDateLocaleIso, prochainsJours, SLOTS, SLOT_LABELS, type Slot } from "@/lib/plan";

export type RecetteFiche = {
  id: string;
  title: string;
  servings: number;
  minutes: number | null;
  tags: string[];
  ingredients: unknown;
  steps: unknown;
  categorieId: string | null;
  categorieNom: string | null;
  isPublic: boolean;
  validatedAt: Date | string | null;
  validationCount: number;
  isSharedCopy: boolean;
  createdById: string;
  validators: string[];
};

/** Nom + « — quantite unite » si présents ; tolérant (Json Prisma). */
function formaterIngredient(i: unknown): string {
  if (typeof i === "string") return i;
  if (typeof i === "object" && i !== null && "nom" in i) {
    const { nom, quantite, unite } = i as { nom: unknown; quantite?: unknown; unite?: unknown };
    if (typeof nom !== "string") return "";
    const suite =
      (typeof quantite === "number" && quantite > 0) || typeof quantite === "string"
        ? ` — ${quantite}${typeof unite === "string" && unite ? ` ${unite}` : ""}`
        : "";
    return `${nom}${suite}`;
  }
  return "";
}

const labelJour = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(date)
  );

/**
 * Fiche recette en bottom sheet : méta, tags, ingrédients formatés, étapes,
 * ajout rapide au planning et suppression dans le footer. Ne emit aucun
 * événement Miamz à la suppression (règle du ledger 2a) ; l'ajout au planning
 * émet « repas-planifie » comme la grille.
 */
export default function FeuilleRecette({
  recette,
  onFermer,
}: {
  recette: RecetteFiche | null;
  onFermer: () => void;
}) {
  const router = useRouter();
  const { emettre } = useMiamz();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [jours] = useState(() =>
    prochainsJours(new Date(`${formatDateLocaleIso(new Date())}T00:00:00Z`)).map(formatDateIso)
  );
  const [jour, setJour] = useState(() => jours[0]);
  const [service, setService] = useState<Slot>("DEJEUNER");
  const [portions, setPortions] = useState(1);
  const [enCoursAjout, setEnCoursAjout] = useState(false);
  const [erreurAjout, setErreurAjout] = useState<string | null>(null);
  const [succesAjout, setSuccesAjout] = useState<string | null>(null);

  async function supprimer() {
    if (!recette) return;
    setEnCours(true);
    setErreur(false);
    try {
      const res = await fetch(`/api/recipes/${recette.id}`, { method: "DELETE" });
      if (res.ok) {
        onFermer();
        router.refresh();
      } else {
        setErreur(true);
      }
    } finally {
      setEnCours(false);
    }
  }

  async function ajouterAuPlanning() {
    if (!recette) return;
    setEnCoursAjout(true);
    setErreurAjout(null);
    setSuccesAjout(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: jour,
          slot: service,
          recipeId: recette.id,
          servings: portions,
        }),
      });
      if (res.ok) {
        emettre("repas-planifie");
        setSuccesAjout(`Ajouté au planning : ${labelJour(jour)} · ${SLOT_LABELS[service]}`);
        setAjoutOuvert(false);
        router.refresh();
      } else if (res.status === 409) {
        setErreurAjout("Ce créneau est déjà occupé — choisis un autre jour ou service.");
      } else if (res.status === 404) {
        setErreurAjout("Ajoute d'abord cette recette à tes recettes pour la planifier.");
      } else {
        setErreurAjout("Ajout impossible — réessaie.");
      }
    } catch {
      setErreurAjout("Ajout impossible — réessaie.");
    } finally {
      setEnCoursAjout(false);
    }
  }

  if (!recette) return null;

  const ingredients = (Array.isArray(recette.ingredients) ? recette.ingredients : [])
    .map(formaterIngredient)
    .filter(Boolean);
  const etapes = (Array.isArray(recette.steps) ? recette.steps : []).filter(
    (e): e is string => typeof e === "string" && e.length > 0
  );

  return (
    <FeuilleModale
      ouvert
      onFermer={onFermer}
      titre={recette.title}
      footer={
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setErreurAjout(null);
              setSuccesAjout(null);
              setAjoutOuvert((v) => !v);
            }}
            aria-expanded={ajoutOuvert}
            className="bouton min-h-11 w-full"
          >
            Ajouter au planning
          </button>
          <button type="button" onClick={supprimer} disabled={enCours} className="bouton-danger min-h-11 w-full">
            {enCours ? "Suppression…" : "Supprimer la recette"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-texte-doux">
        {recette.servings} portion{recette.servings > 1 ? "s" : ""}
        {recette.minutes ? ` · ${recette.minutes} min` : ""}
      </p>
      {erreur && <p className="mt-2 text-sm text-danger">Suppression impossible — réessaie.</p>}
      {succesAjout && (
        <p role="status" aria-live="polite" className="mt-2 text-sm font-medium text-[#4A6741]">
          {succesAjout}
        </p>
      )}

      {ajoutOuvert && (
        <div className="mt-3 rounded-2xl border border-[#A8E6CF] bg-[#A8E6CF]/10 p-3">
          <h3 className="text-sm font-semibold text-foreground">Ajouter au planning</h3>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <select
              value={jour}
              onChange={(e) => setJour(e.target.value)}
              aria-label="Jour"
              className="champ min-h-11 min-w-0 flex-1"
            >
              {jours.map((d) => (
                <option key={d} value={d}>
                  {labelJour(d)}
                </option>
              ))}
            </select>
            <select
              value={service}
              onChange={(e) => setService(e.target.value as Slot)}
              aria-label="Service"
              className="champ min-h-11 min-w-0 flex-1"
            >
              {SLOTS.map((s) => (
                <option key={s} value={s}>
                  {SLOT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-texte-doux">Portions</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPortions((p) => Math.max(1, p - 1))}
                disabled={portions <= 1 || enCoursAjout}
                aria-label="Moins de portions"
                className="bouton-secondaire h-11 w-11 px-0"
              >
                −
              </button>
              <span className="min-w-6 text-center font-semibold">{portions}</span>
              <button
                type="button"
                onClick={() => setPortions((p) => Math.min(12, p + 1))}
                disabled={portions >= 12 || enCoursAjout}
                aria-label="Plus de portions"
                className="bouton-secondaire h-11 w-11 px-0"
              >
                +
              </button>
            </div>
          </div>

          {erreurAjout && <p className="mt-2 text-sm text-danger">{erreurAjout}</p>}

          <button
            type="button"
            onClick={ajouterAuPlanning}
            disabled={enCoursAjout}
            className="bouton mt-2 min-h-11 w-full"
          >
            {enCoursAjout ? "Ajout…" : `Ajouter ${labelJour(jour)}`}
          </button>
        </div>
      )}

      {recette.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {recette.tags.map((t) => (
            <span key={t} className="puce">
              {t}
            </span>
          ))}
        </div>
      )}

      {ingredients.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Ingrédients</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-foreground">
            {ingredients.map((ing, i) => (
              <li key={i}>{ing}</li>
            ))}
          </ul>
        </>
      )}

      {etapes.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold text-foreground">Étapes</h3>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-foreground">
            {etapes.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </>
      )}
    </FeuilleModale>
  );
}

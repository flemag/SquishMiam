"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FeuilleModale from "@/components/ui/feuille-modale";

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

/**
 * Fiche recette en bottom sheet : méta, tags, ingrédients formatés, étapes,
 * et la suppression dans le footer (plus de bouton sur la carte). Ne emit
 * aucun événement Miamz (règle du ledger 2a : la suppression d'une recette
 * n'est pas un événement repas).
 */
export default function FeuilleRecette({
  recette,
  onFermer,
}: {
  recette: RecetteFiche | null;
  onFermer: () => void;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState(false);

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
        <button type="button" onClick={supprimer} disabled={enCours} className="bouton-danger min-h-11 w-full">
          {enCours ? "Suppression…" : "Supprimer la recette"}
        </button>
      }
    >
      <p className="text-sm text-texte-doux">
        {recette.servings} portion{recette.servings > 1 ? "s" : ""}
        {recette.minutes ? ` · ${recette.minutes} min` : ""}
      </p>
      {erreur && <p className="mt-2 text-sm text-danger">Suppression impossible — réessaie.</p>}

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

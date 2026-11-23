/**
 * Décisions pures du panneau admin pour les catégories.
 * Aucune I/O : les routes API (Task 7) s'appuient sur ces verdicts pour
 * renommer sans doublon et fusionner sans masquer de recettes par erreur.
 */

import { CATEGORIE_AUTRE, normaliserCategorie } from "@/lib/categories";

export type CategoriePourDecision = {
  id: string;
  nom: string;
  cle: string;
  masquee: boolean;
};

export type DecisionRenommage =
  | { ok: true; cle: string }
  | { ok: false; raison: "vide" | "trop-long" }
  | { ok: false; raison: "collision"; categorie: { id: string; nom: string } };

export function decisionRenommage(
  nom: string,
  id: string,
  categories: readonly CategoriePourDecision[]
): DecisionRenommage {
  const nomPropre = nom.trim();
  if (!nomPropre) return { ok: false, raison: "vide" };
  if (nomPropre.length > 60) return { ok: false, raison: "trop-long" };

  const cle = normaliserCategorie(nomPropre);
  if (!cle) return { ok: false, raison: "vide" };

  const autre = categories.find((c) => c.cle === cle && c.id !== id);
  if (autre) {
    return { ok: false, raison: "collision", categorie: { id: autre.id, nom: autre.nom } };
  }
  return { ok: true, cle };
}

export type DecisionFusion =
  | { ok: true }
  | { ok: false; raison: "meme-categorie" | "source-autre" | "inconnue" | "cible-masquee" };

export function decisionFusion(
  sourceId: string,
  cibleId: string,
  categories: readonly CategoriePourDecision[]
): DecisionFusion {
  if (sourceId === cibleId) return { ok: false, raison: "meme-categorie" };

  const source = categories.find((c) => c.id === sourceId);
  const cible = categories.find((c) => c.id === cibleId);
  if (!source || !cible) return { ok: false, raison: "inconnue" };
  if (source.id === CATEGORIE_AUTRE) return { ok: false, raison: "source-autre" };
  if (cible.masquee) return { ok: false, raison: "cible-masquee" };
  return { ok: true };
}

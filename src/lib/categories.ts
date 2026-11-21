/**
 * Catégories de recettes — normalisation des noms et constantes partagées.
 * La clé normalisée sert à dédupliquer les catégories (POST /api/categories).
 */

import { normaliser } from "@/lib/recherche-recettes";

/** Id stable de la catégorie par défaut « Autre ». */
export const CATEGORIE_AUTRE = "cat-autre";

export type CategorieVue = { id: string; nom: string };

/** Minuscules, sans accents, œ/æ dépliés, bords trimmés, espaces internes compactés. */
export function normaliserCategorie(nom: string): string {
  return normaliser(nom).trim().replace(/\s+/g, " ");
}

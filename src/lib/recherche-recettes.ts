/**
 * Recherche, filtres et tri de recettes — pur et testé.
 * Sémantique (design doc 2c) : jetons en ET, champs (titre/ingrédients) en OU,
 * normalisation accents + œ/æ ; minutes null = « Toutes » seulement, dernière au tri durée.
 */

export type RecetteRecherchable = {
  id: string;
  title: string;
  minutes: number | null;
  tags: string[];
  ingredientNoms: string[];
};

export type Tri = "recent" | "alpha" | "duree";

export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Extrait les noms valides d'un champ Json Prisma (tolérant : null, hétérogène). */
export function nomsIngredients(ingredients: unknown): string[] {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .map((i) => {
      if (typeof i === "string") return i; // ingrédient stocké en chaîne nue
      if (typeof i === "object" && i !== null && "nom" in i) return (i as { nom: unknown }).nom;
      return undefined;
    })
    .filter((nom): nom is string => typeof nom === "string" && nom.length > 0);
}

export function correspondRecette(recette: { title: string; ingredientNoms: string[] }, requete: string): boolean {
  const jetons = normaliser(requete).split(/\s+/).filter(Boolean);
  if (jetons.length === 0) return true;
  const titre = normaliser(recette.title);
  const ingredients = recette.ingredientNoms.map(normaliser);
  return jetons.every((jeton) => titre.includes(jeton) || ingredients.some((ing) => ing.includes(jeton)));
}

export function filtrerRecettes<T extends RecetteRecherchable>(
  recettes: T[],
  filtres: { requete: string; tags: string[]; dureeMax: number | null }
): T[] {
  return recettes.filter((r) => {
    if (!correspondRecette(r, filtres.requete)) return false;
    if (!filtres.tags.every((t) => r.tags.includes(t))) return false;
    if (filtres.dureeMax !== null && (r.minutes === null || r.minutes > filtres.dureeMax)) return false;
    return true;
  });
}

export function trierRecettes<T extends RecetteRecherchable>(recettes: T[], tri: Tri): T[] {
  const copie = [...recettes];
  if (tri === "alpha") copie.sort((x, y) => x.title.localeCompare(y.title, "fr"));
  if (tri === "duree") copie.sort((x, y) => (x.minutes ?? Infinity) - (y.minutes ?? Infinity));
  return copie; // "recent" : l'ordre serveur (createdAt desc) est conservé
}

import { RecetteExtraite, parseServings } from "@/lib/import-recette";

export const MAX_IDEE = 300;

/** Vérifie qu'une idée utilisateur est exploitable. */
export function ideeValide(idee: string): boolean {
  if (typeof idee !== "string") return false;
  const propre = idee.trim();
  return propre.length > 0 && propre.length <= MAX_IDEE;
}

/** Parse la réponse IA du brouillon ; toute forme inexploitable renvoie null. */
export function parserRecetteGeneree(contenu: string): RecetteExtraite | null {
  if (!contenu || typeof contenu !== "string") return null;

  const nettoye = contenu
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(nettoye);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const objet = parsed as Record<string, unknown>;

  const title = typeof objet.title === "string" ? objet.title.trim() : "";
  if (!title) return null;

  const ingredientsBrut = objet.ingredients;
  if (!Array.isArray(ingredientsBrut) || ingredientsBrut.length === 0) return null;

  const ingredients = ingredientsBrut
    .map((i): { nom: string; quantite?: number; unite?: string } | null => {
      if (!i || typeof i !== "object") return null;
      const ing = i as Record<string, unknown>;
      const nom = typeof ing.nom === "string" ? ing.nom.trim() : "";
      if (!nom) return null;
      const quantite = typeof ing.quantite === "number" && ing.quantite > 0 ? ing.quantite : undefined;
      const unite = typeof ing.unite === "string" && ing.unite.trim() ? ing.unite.trim() : undefined;
      return { nom, quantite, unite };
    })
    .filter((i): i is { nom: string; quantite?: number; unite?: string } => i !== null);

  if (ingredients.length === 0) return null;

  const servings = typeof objet.servings !== "undefined" ? parseServings(objet.servings) : 1;
  const minutes =
    typeof objet.minutes === "number" && Number.isInteger(objet.minutes) && objet.minutes > 0
      ? objet.minutes
      : undefined;

  const tags: string[] = Array.isArray(objet.tags)
    ? objet.tags
        .map((t) => (typeof t === "string" ? t.trim() : ""))
        .filter((t) => t.length > 0)
    : [];

  const steps: string[] = Array.isArray(objet.steps)
    ? objet.steps
        .map((s) => (typeof s === "string" ? s.trim() : ""))
        .filter((s) => s.length > 0)
    : [];

  return { title, servings, minutes, tags, ingredients, steps };
}
import { RecetteExtraite, parseServings } from "@/lib/import-recette";
import { parserRecetteGeneree } from "@/lib/creation-recette";

const ARTICLES = new Set(["le", "la", "les", "de", "du", "des", "un", "une", "l", "d"]);

/** Normalise un nom d'ingrédient : minuscules, sans accents, sans articles, singulier. */
export function normaliserIngredient(nom: string): string {
  if (typeof nom !== "string") return "";
  let s = nom.trim().toLowerCase();
  // Convertir les ligatures
  s = s.replace(/œ/g, "oe").replace(/æ/g, "ae");
  // Supprimer les accents
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Supprimer les articles en début
  const mots = s.split(/\s+/).filter((m) => m && !ARTICLES.has(m));
  s = mots.join(" ");
  // Singulier (retirer le 's' final si > 3 caractères)
  if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) {
    s = s.slice(0, -1);
  }
  return s.trim();
}

/** Extrait une liste d'ingrédients depuis la réponse IA (JSON ou texte). */
export function extraireIngredients(contenu: string): string[] {
  if (!contenu || typeof contenu !== "string") return [];
  const nettoye = contenu.trim();
  if (nettoye === "null" || nettoye === "undefined" || nettoye === "") return [];

  // Tenter JSON
  try {
    const parsed = JSON.parse(nettoye.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim());
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.ingredients)) {
      return parsed.ingredients
        .map((i: unknown) => (typeof i === "string" ? i.trim() : ""))
        .filter((i: string) => i.length > 0);
    }
  } catch {
    // Pas du JSON
  }

  // Fallback : liste séparée par virgules ou retours à la ligne
  return nettoye
    .split(/[,\n;]/)
    .map((s) => s.trim().replace(/œ/g, "oe").replace(/æ/g, "ae"))
    .filter((s) => s.length > 0 && !s.startsWith("{") && !s.startsWith("["));
}

/** Matche les recettes existantes avec les ingrédients détectés. */
export function matcherRecettes(
  ingredients: string[],
  recettes: { id: string; title: string; ingredients: { nom: string }[] }[]
): { id: string; title: string; score: number; matches: string[] }[] {
  if (!ingredients.length || !recettes.length) return [];

  const ingredientsNorm = ingredients.map(normaliserIngredient).filter(Boolean);

  const resultats = recettes
    .map((r) => {
      const ingRecette = r.ingredients.map((i) => normaliserIngredient(i.nom)).filter(Boolean);
      if (ingRecette.length === 0) return null;

      const matches: string[] = [];
      for (let i = 0; i < ingRecette.length; i++) {
        const ing = ingRecette[i];
        const originalNom = r.ingredients[i].nom;
        const match = ingredientsNorm.some(
          (det) => det.includes(ing) || ing.includes(det) || det === ing
        );
        if (match) matches.push(originalNom);
      }

      const score = matches.length / ingRecette.length;
      if (score === 0) return null;

      return { id: r.id, title: r.title, score, matches };
    })
    .filter((r): r is { id: string; title: string; score: number; matches: string[] } => r !== null);

  // Trier par score décroissant, puis par titre
  resultats.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "fr"));
  return resultats;
}

/** Parse la réponse IA du photo frigo. */
export function parserPhotoFrigo(
  contenu: string
): { ingredients: string[]; brouillon?: RecetteExtraite } | null {
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

  const ingredients = extraireIngredients(JSON.stringify({ ingredients: objet.ingredients }));
  if (ingredients.length === 0) return null;

  let brouillon: RecetteExtraite | undefined;
  if (objet.brouillon && typeof objet.brouillon === "object") {
    brouillon = parserRecetteGeneree(JSON.stringify(objet.brouillon)) ?? undefined;
  }

  return { ingredients, brouillon };
}
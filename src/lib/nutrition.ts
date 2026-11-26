export type NutritionPar100g = {
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
};

export type NutritionRecette = {
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
};

export type NutritionJour = {
  date: string;
  calories: number;
  proteines: number;
  glucides: number;
  lipides: number;
};

/** Normalise un nom d'ingrédient pour la recherche. */
export function normaliserNomIngredient(nom: string): string {
  if (typeof nom !== "string") return "";
  return nom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Convertit une quantité + unité en grammes (approximation). */
function enGrammes(quantite: number, unite?: string): number {
  const u = (unite ?? "g").toLowerCase().trim();
  if (u === "g" || u === "") return quantite;
  if (u === "kg") return quantite * 1000;
  if (u === "mg") return quantite / 1000;
  if (u === "ml") return quantite; // approximation 1ml ≈ 1g
  if (u === "cl") return quantite * 10;
  if (u === "l") return quantite * 1000;
  if (u === "pièce" || u === "piece" || u === "pcs") return quantite * 100;
  if (u === "boîte" || u === "boite") return quantite * 200;
  if (u === "c. à soupe" || u === "cas") return quantite * 15;
  if (u === "c. à café" || u === "cac") return quantite * 5;
  // Défaut : 100g par unité
  return quantite * 100;
}

/** Calcule la nutrition d'une recette à partir de ses ingrédients. */
export function calculerNutritionRecette(
  ingredients: { nom: string; quantite?: number; unite?: string }[],
  lookup: (nom: string) => NutritionPar100g | null
): NutritionRecette | null {
  if (!ingredients || ingredients.length === 0) return null;

  let totalCalories = 0;
  let totalProteines = 0;
  let totalGlucides = 0;
  let totalLipides = 0;
  let hasData = false;

  for (const ing of ingredients) {
    if (!ing.nom) continue;
    const nutri = lookup(normaliserNomIngredient(ing.nom));
    if (!nutri) continue;

    hasData = true;
    const qte = typeof ing.quantite === "number" && ing.quantite > 0 ? ing.quantite : 1;
    const grammes = enGrammes(qte, ing.unite);
    const facteur = grammes / 100;

    totalCalories += nutri.calories * facteur;
    totalProteines += nutri.proteines * facteur;
    totalGlucides += nutri.glucides * facteur;
    totalLipides += nutri.lipides * facteur;
  }

  if (!hasData) return null;

  // Par portion (servings par défaut 1, mais on ne divise pas ici — la division
  // se fait côté API avec le nombre de portions de la recette)
  return {
    calories: Math.round(totalCalories),
    proteines: Math.round(totalProteines * 10) / 10,
    glucides: Math.round(totalGlucides * 10) / 10,
    lipides: Math.round(totalLipides * 10) / 10,
  };
}

/** Agrège la nutrition par jour pour une semaine. */
export function agregerSemaine(
  entries: { date: string; servings: number; nutrition: NutritionRecette | null }[]
): NutritionJour[] {
  const parJour = new Map<string, NutritionJour>();

  for (const e of entries) {
    if (!e.nutrition) continue;
    const existing = parJour.get(e.date) ?? {
      date: e.date,
      calories: 0,
      proteines: 0,
      glucides: 0,
      lipides: 0,
    };

    const servings = e.servings > 0 ? e.servings : 1;
    existing.calories += e.nutrition.calories * servings;
    existing.proteines += e.nutrition.proteines * servings;
    existing.glucides += e.nutrition.glucides * servings;
    existing.lipides += e.nutrition.lipides * servings;

    parJour.set(e.date, existing);
  }

  return [...parJour.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Calories cible par jour selon l'objectif. */
export function objectifCalorique(goal: string): number {
  switch (goal) {
    case "perte_poids": return 1600;
    case "prise_masse": return 2500;
    case "sante": return 1800;
    case "famille": return 2000;
    case "equilibre":
    default: return 2000;
  }
}
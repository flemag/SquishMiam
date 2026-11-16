import { mapToRayon, RAYONS, type Rayon } from "@/lib/rayons";

// Le plan expose mapToRayon via courses (consommé par l'UI et les tests).
export { mapToRayon };

export type IngredientJson = { nom: string; quantite?: number; unite?: string };

export type EntreePlanAvecRecette = {
  recipe: { servings: number; ingredients: IngredientJson[] };
  servings: number;
};

export type GroupeRayon = {
  rayon: string;
  items: { nom: string; quantite: number | null; unite: string | null }[];
};

export function scaleQuantity(quantite: number, baseServings: number, targetServings: number): number {
  const ratio = targetServings / baseServings;
  return Math.round(quantite * ratio * 100) / 100;
}

export function aggregateGroceries(entries: EntreePlanAvecRecette[]): GroupeRayon[] {
  // clé : nom + unite → somme ; les unités différentes restent des lignes séparées
  const fusion = new Map<string, { nom: string; quantite: number | null; unite: string | null; rayon: string }>();

  for (const entry of entries) {
    const ratio = entry.recipe.servings > 0 ? entry.servings / entry.recipe.servings : 1;
    for (const ing of entry.recipe.ingredients) {
      const nom = ing.nom.trim();
      if (!nom) continue;
      const unite = ing.unite?.trim() || null;
      const cle = `${nom.toLowerCase()}|${unite ?? ""}`;
      const quantite =
        ing.quantite !== undefined ? Math.round(ing.quantite * ratio * 100) / 100 : null;

      const existant = fusion.get(cle);
      if (existant && quantite !== null && existant.quantite !== null) {
        existant.quantite = Math.round((existant.quantite + quantite) * 100) / 100;
      } else if (!existant) {
        fusion.set(cle, {
          nom,
          quantite,
          unite,
          rayon: mapToRayon(nom),
        });
      }
    }
  }

  // groupes dans l'ordre du dictionnaire de rayons
  const groupes: GroupeRayon[] = [];
  for (const rayon of RAYONS) {
    const items = [...fusion.values()].filter((i) => i.rayon === rayon);
    if (items.length > 0) {
      groupes.push({ rayon, items: items.map(({ nom, quantite, unite }) => ({ nom, quantite, unite })) });
    }
  }
  // rayons inattendus (hors dictionnaire) — improbable, mais on ne perd rien
  const horsDico = [...fusion.values()].filter((i) => !RAYONS.includes(i.rayon as Rayon));
  if (horsDico.length > 0) {
    groupes.push({ rayon: "Épicerie", items: horsDico.map(({ nom, quantite, unite }) => ({ nom, quantite, unite })) });
  }

  return groupes;
}

const format = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });

export function formatQuantite(q: number, unite: string | null): string {
  return `${format.format(q)}${unite ? ` ${unite}` : ""}`;
}

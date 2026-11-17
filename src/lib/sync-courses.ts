import type { Prisma } from "@prisma/client";
import { aggregateGroceries, type EntreePlanAvecRecette } from "@/lib/courses";
import { reconcilerListe, type LigneProjetee } from "@/lib/reconciliation-courses";
import { weekStart } from "@/lib/plan";

/**
 * Synchronise la liste de courses de chaque semaine touchée par `dates` :
 * la projection du plan de repas est réconciliée avec les lignes existantes.
 *
 * Règles (liste de courses vivante) :
 * - les lignes MANUELLES sont préservées (bouclier dans `reconcilerListe`) ;
 * - les mises à jour n'écrivent que `quantite` et `rayon` — `checked`,
 *   `masquee` et `source` ne sont jamais touchés ;
 * - les créations héritent des valeurs par défaut du schéma
 *   (source = PLAN, masquee = false, checked = false).
 *
 * À appeler dans une transaction ; jamais côté client.
 */
export async function synchroniserCourses(
  tx: Prisma.TransactionClient,
  ownerId: string,
  dates: Date[]
): Promise<void> {
  // Débuts de semaine (lundi UTC), dédupliqués, dans l'ordre chronologique.
  const semaines = [...new Set(dates.map((d) => weekStart(d).getTime()))]
    .sort((a, b) => a - b)
    .map((t) => new Date(t));

  for (const debut of semaines) {
    const fin = new Date(debut);
    fin.setUTCDate(fin.getUTCDate() + 7);

    // Projection : repas de la semaine → groupes par rayon → lignes plates.
    const entries = await tx.mealPlanEntry.findMany({
      where: { ownerId, date: { gte: debut, lt: fin } },
      include: { recipe: { select: { servings: true, ingredients: true } } },
    });
    const entrees: EntreePlanAvecRecette[] = entries.map((e) => ({
      recipe: {
        servings: e.recipe.servings,
        ingredients: e.recipe.ingredients as unknown as EntreePlanAvecRecette["recipe"]["ingredients"],
      },
      servings: e.servings,
    }));
    const projection: LigneProjetee[] = aggregateGroceries(entrees).flatMap((groupe) =>
      groupe.items.map((item) => ({ ...item, rayon: groupe.rayon }))
    );

    // Lignes existantes de la semaine (source/masquee/checked lus tels quels).
    const rows = await tx.groceryListItem.findMany({ where: { ownerId, weekStart: debut } });
    const existantes = rows.map((row) => ({
      id: row.id,
      nom: row.nom,
      quantite: row.quantite,
      unite: row.unite,
      rayon: row.rayon,
      checked: row.checked,
      masquee: row.masquee,
      source: row.source,
    }));

    const plan = reconcilerListe(existantes, projection);

    if (plan.aCreer.length > 0) {
      await tx.groceryListItem.createMany({
        data: plan.aCreer.map((ligne) => ({ ...ligne, weekStart: debut, ownerId })),
      });
    }
    for (const ligne of plan.aMettreAJour) {
      // Jamais checked/masquee/source ici.
      await tx.groceryListItem.update({
        where: { id: ligne.id },
        data: { quantite: ligne.quantite, rayon: ligne.rayon },
      });
    }
    if (plan.aSupprimer.length > 0) {
      await tx.groceryListItem.deleteMany({ where: { id: { in: plan.aSupprimer } } });
    }
  }
}

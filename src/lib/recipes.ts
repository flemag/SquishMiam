import { db } from "@/lib/db";

/**
 * Vérifie que l'utilisateur est l'auteur de la recette.
 * Retourne la recette si OK, throw sinon.
 */
export async function exigerAuteur(recipeId: string, userId: string) {
  const recipe = await db.recipe.findUnique({
    where: { id: recipeId },
    select: { id: true, createdById: true },
  });
  if (!recipe) {
    const err = new Error("Recette introuvable") as Error & { status: number };
    err.status = 404;
    throw err;
  }
  if (recipe.createdById !== userId) {
    const err = new Error("Tu n'es pas l'auteur de cette recette") as Error & { status: number };
    err.status = 403;
    throw err;
  }
  return recipe;
}
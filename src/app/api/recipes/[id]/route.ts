import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipeInput } from "@/lib/recipes-schema";
import { synchroniserCourses } from "@/lib/sync-courses";
import { NextResponse } from "next/server";

async function proprietaireOuRefus(id: string, expectedUserId: string) {
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.createdById !== expectedUserId) return null;
  if (recipe.editable === false) return null; // Copie lecture seule : modifications interdites
  return recipe;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  if (!(await proprietaireOuRefus(id, userId))) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = recipeInput.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Recette invalide" }, { status: 400 });

  if (parsed.data.categorieId !== undefined) {
    const catOk = await db.categorie.findFirst({ where: { id: parsed.data.categorieId, masquee: false }, select: { id: true } });
    if (!catOk) return NextResponse.json({ error: "Catégorie inconnue" }, { status: 400 });
  }

  // Seuls ingrédients et portions influencent la liste de courses.
  const toucheListe = parsed.data.ingredients !== undefined || parsed.data.servings !== undefined;

  // Liste de courses vivante : update puis resynchronisation des semaines touchées
  // dans la même transaction. L'update passe en premier pour projeter les NOUVEAUX
  // ingrédients ; tous les repas d'une recette appartiennent à son créateur.
  const recipe = await db.$transaction(async (tx) => {
    const misAJour = await tx.recipe.update({ where: { id }, data: parsed.data });
    if (toucheListe) {
      const entrees = await tx.mealPlanEntry.findMany({
        where: { recipeId: id },
        select: { date: true },
      });
      if (entrees.length > 0) {
        await synchroniserCourses(tx, userId, entrees.map((e) => e.date));
      }
    }
    return misAJour;
  }, { timeout: 20_000, maxWait: 5_000 });
  return NextResponse.json({ recipe });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  if (!(await proprietaireOuRefus(id, userId))) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  // Liste de courses vivante : les dates sont collectées AVANT le delete (cascade
  // sur MealPlanEntry), puis la suppression et la resynchronisation forment une
  // seule transaction — les ingrédients de la recette sont purgés, les lignes
  // manuelles restent.
  await db.$transaction(async (tx) => {
    const entrees = await tx.mealPlanEntry.findMany({
      where: { recipeId: id },
      select: { date: true },
    });
    await tx.recipe.delete({ where: { id } });
    if (entrees.length > 0) {
      await synchroniserCourses(tx, userId, entrees.map((e) => e.date));
    }
  }, { timeout: 20_000, maxWait: 5_000 });
  return NextResponse.json({ ok: true });
}

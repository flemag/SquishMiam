import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exigerAuteur } from "@/lib/recipes";
import { peutPartager } from "@/lib/boutique";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  // Vérifier que la recette source existe et est validée
  const sourceRecipe = await db.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      servings: true,
      minutes: true,
      tags: true,
      ingredients: true,
      steps: true,
      createdById: true,
      categorieId: true,
      validatedAt: true,
      sharedWith: true,
    },
  });

  if (!sourceRecipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  if (!peutPartager({ validatedAt: sourceRecipe.validatedAt })) {
    return NextResponse.json({ error: "Cette recette n'est pas encore validée" }, { status: 403 });
  }
  if (sourceRecipe.sharedWith.includes(userId)) {
    return NextResponse.json({ error: "Tu as déjà ajouté cette recette à ta cuisine" }, { status: 409 });
  }

  // Créer la copie lecture seule
  const copy = await db.recipe.create({
    data: {
      title: sourceRecipe.title,
      servings: sourceRecipe.servings,
      minutes: sourceRecipe.minutes,
      tags: sourceRecipe.tags,
      ingredients: sourceRecipe.ingredients as import("@prisma/client/runtime/library").InputJsonValue,
      steps: sourceRecipe.steps,
      createdById: userId,
      categorieId: sourceRecipe.categorieId,
      isPublic: false,
      isSharedCopy: true,
      sourceRecipeId: sourceRecipe.id,
      editable: false,
    },
    select: { id: true },
  });

  // Ajouter l'utilisateur aux sharedWith de la recette source
  await db.recipe.update({
    where: { id },
    data: { sharedWith: { push: userId } },
  });

  return NextResponse.json({ recipeId: copy.id });
}
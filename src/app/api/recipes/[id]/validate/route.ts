import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculerJetonsApresValidation, estValidee } from "@/lib/boutique";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  // Vérifier que la recette existe et est publique
  const recipe = await db.recipe.findUnique({
    where: { id },
    select: {
      id: true,
      createdById: true,
      isPublic: true,
      validationCount: true,
      validators: true,
    },
  });

  if (!recipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  if (!recipe.isPublic) return NextResponse.json({ error: "Recette non publiée" }, { status: 403 });

  // Vérifications métier
  if (recipe.createdById === userId) {
    return NextResponse.json({ error: "Tu ne peux pas valider ta propre recette" }, { status: 403 });
  }
  if (recipe.validators.includes(userId)) {
    return NextResponse.json({ error: "Tu as déjà validé cette recette" }, { status: 409 });
  }

  // Transaction : validation + jetons
  const result = await db.$transaction(async (tx) => {
    // Badge posé une seule fois, au franchissement du seuil.
    const devientValidee = !estValidee(recipe.validationCount) && estValidee(recipe.validationCount + 1);
    const updated = await tx.recipe.update({
      where: { id },
      data: {
        validators: { push: userId },
        validationCount: { increment: 1 },
        ...(devientValidee ? { validatedAt: new Date() } : {}),
      },
      select: { validationCount: true, validatedAt: true },
    });

    // Jetons pour le validateur (plafonnés)
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { tokens: true },
    });

    const jetonsAvant = user?.tokens ?? 0;
    const newTokens = calculerJetonsApresValidation(jetonsAvant);
    const tokenGained = newTokens > jetonsAvant;

    if (tokenGained) {
      await tx.user.update({ where: { id: userId }, data: { tokens: newTokens } });

      // Enregistrer la transaction
      await tx.tokenTransaction.create({
        data: {
          userId,
          amount: 1,
          reason: "validation",
          recipeId: id,
        },
      });
    }

    return { validationCount: updated.validationCount, validatedAt: updated.validatedAt, newTokens, tokenGained };
  });

  return NextResponse.json({
    validationCount: result.validationCount,
    isValidated: result.validatedAt !== null,
    tokenGained: result.tokenGained,
    tokens: result.newTokens,
  });
}
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { peutAcheter } from "@/lib/boutique-items";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const itemId = typeof body?.itemId === "string" ? body.itemId : "";
  if (!itemId) return NextResponse.json({ error: "Article requis" }, { status: 400 });

  const item = await db.boutiqueItem.findUnique({ where: { id: itemId } });
  if (!item || !item.actif) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { tokens: true, purchasedItems: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const dejaAchete = user.purchasedItems.includes(itemId);

  if (!peutAcheter({ tokens: user.tokens, prix: item.prix, dejaAchete })) {
    if (dejaAchete) return NextResponse.json({ error: "Déjà possédé" }, { status: 409 });
    return NextResponse.json({ error: `Solde insuffisant (${item.prix} jetons requis, tu en as ${user.tokens})` }, { status: 403 });
  }

  // Transaction : débit + achat + copie des recettes si pack
  const result = await db.$transaction(async (tx) => {
    if (item.prix > 0) {
      await tx.user.update({
        where: { id: userId },
        data: { tokens: { decrement: item.prix } },
      });
      await tx.tokenTransaction.create({
        data: { userId, amount: -item.prix, reason: "achat", recipeId: null },
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: { purchasedItems: { push: itemId } },
    });

    // Si pack, copier les recettes
    const meta = item.metadata as Record<string, unknown>;
    if (item.type === "pack" && Array.isArray(meta.recipeIds)) {
      const recipeIds = meta.recipeIds as string[];
      const recipes = await tx.recipe.findMany({
        where: { id: { in: recipeIds } },
      });
      for (const r of recipes) {
        await tx.recipe.create({
          data: {
            title: r.title,
            servings: r.servings,
            minutes: r.minutes,
            tags: r.tags,
            ingredients: r.ingredients as import("@prisma/client/runtime/library").InputJsonValue,
            steps: r.steps,
            createdById: userId,
            categorieId: r.categorieId,
            isPublic: false,
            isSharedCopy: true,
            sourceRecipeId: r.id,
            editable: false,
          },
        });
      }
    }

    const updatedUser = await tx.user.findUnique({ where: { id: userId }, select: { tokens: true } });
    return { tokens: updatedUser?.tokens ?? user.tokens };
  });

  return NextResponse.json({ ok: true, tokens: result.tokens });
}
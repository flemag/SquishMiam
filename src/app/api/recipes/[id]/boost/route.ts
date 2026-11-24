import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { peutBooster, calculerBoostedUntil, COUT_BOOST, DUREE_BOOST_JOURS } from "@/lib/boost";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  const recipe = await db.recipe.findUnique({
    where: { id },
    select: { id: true, createdById: true, isPublic: true, boostedUntil: true },
  });
  if (!recipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { tokens: true } });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const now = new Date();
  const isAuthor = recipe.createdById === userId;

  if (!peutBooster({ tokens: user.tokens, isPublic: recipe.isPublic, boostedUntil: recipe.boostedUntil, isAuthor, now })) {
    if (!isAuthor) return NextResponse.json({ error: "Tu ne peux booster que tes propres recettes" }, { status: 403 });
    if (!recipe.isPublic) return NextResponse.json({ error: "Publie d'abord ta recette" }, { status: 403 });
    if (recipe.boostedUntil && recipe.boostedUntil > now) return NextResponse.json({ error: "Cette recette est déjà boostée" }, { status: 409 });
    return NextResponse.json({ error: `Il te faut ${COUT_BOOST} jetons (tu en as ${user.tokens})` }, { status: 403 });
  }

  const boostedUntil = calculerBoostedUntil(now);

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { tokens: { decrement: COUT_BOOST } } });
    await tx.tokenTransaction.create({
      data: { userId, amount: -COUT_BOOST, reason: "boost", recipeId: id },
    });
    await tx.recipe.update({ where: { id }, data: { boostedUntil } });
  });

  return NextResponse.json({ ok: true, boostedUntil, tokens: user.tokens - COUT_BOOST });
}
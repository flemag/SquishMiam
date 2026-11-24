import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validerMouvement, libelleMotif } from "@/lib/jetons-admin";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const recherche = searchParams.get("recherche")?.trim() ?? "";

  const usersWhere: Record<string, unknown> = {};
  if (recherche) {
    usersWhere.OR = [
      { name: { contains: recherche, mode: "insensitive" } },
      { email: { contains: recherche, mode: "insensitive" } },
    ];
  }

  const [users, transactions] = await Promise.all([
    db.user.findMany({
      where: usersWhere,
      orderBy: { tokens: "desc" },
      take: 100,
      select: { id: true, name: true, email: true, role: true, tokens: true },
    }),
    db.tokenTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, email: true } },
      },
    }),
  ]);

  // Récupérer les titres des recettes liées (recipeId optionnel)
  const recipeIds = [...new Set(transactions.map((t) => t.recipeId).filter(Boolean))] as string[];
  const recipes = recipeIds.length > 0
    ? await db.recipe.findMany({ where: { id: { in: recipeIds } }, select: { id: true, title: true } })
    : [];
  const recipeTitleById = new Map(recipes.map((r) => [r.id, r.title]));

  const utilisateurs = users.map((u) => ({
    id: u.id,
    nom: u.name ?? u.email,
    email: u.email,
    role: u.role,
    tokens: u.tokens,
  }));

  const txs = transactions.map((t) => ({
    id: t.id,
    userId: t.userId,
    nom: t.user.name ?? t.user.email,
    email: t.user.email,
    amount: t.amount,
    reason: t.reason,
    libelle: libelleMotif(t.reason),
    recette: t.recipeId ? (recipeTitleById.get(t.recipeId) ?? null) : null,
    createdAt: t.createdAt,
  }));

  return NextResponse.json({ utilisateurs, transactions: txs });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const targetId = typeof body?.userId === "string" ? body.userId : "";
  if (!targetId) return NextResponse.json({ error: "Utilisateur requis" }, { status: 400 });

  const target = await db.user.findUnique({ where: { id: targetId }, select: { id: true, tokens: true } });
  if (!target) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const validation = validerMouvement({
    amount: body?.amount,
    reason: body?.reason,
    solde: target.tokens,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.raison }, { status: 400 });
  }

  const { amount, reason } = validation;

  const result = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: targetId },
      data: { tokens: { increment: amount } },
    });
    await tx.tokenTransaction.create({
      data: { userId: targetId, amount, reason },
    });
    return { tokens: target.tokens + amount };
  });

  return NextResponse.json({ ok: true, tokens: result.tokens, amount, reason });
}
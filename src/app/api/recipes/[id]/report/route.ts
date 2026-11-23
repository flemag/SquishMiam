import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exigerAuteur } from "@/lib/recipes";
import { NextResponse } from "next/server";

const REASONS = ["spam", "inapproprié", "autre"] as const;
type Reason = (typeof REASONS)[number];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  // Vérifier que la recette existe et est publique
  const recipe = await db.recipe.findUnique({
    where: { id },
    select: { id: true, createdById: true, isPublic: true },
  });

  if (!recipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  if (!recipe.isPublic) return NextResponse.json({ error: "Recette non publiée" }, { status: 403 });

  // L'auteur ne peut pas signaler sa propre recette
  if (recipe.createdById === userId) {
    return NextResponse.json({ error: "Tu ne peux pas signaler ta propre recette" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const reason = body?.reason as Reason | undefined;
  const detail = body?.detail as string | undefined;

  if (!reason || !REASONS.includes(reason)) {
    return NextResponse.json({ error: "Raison invalide (spam, inapproprié, autre)" }, { status: 400 });
  }

  await db.report.create({
    data: {
      recipeId: id,
      reporterId: userId,
      reason,
      detail: detail?.trim() || null,
      status: "PENDING",
    },
  });

  return NextResponse.json({ ok: true });
}
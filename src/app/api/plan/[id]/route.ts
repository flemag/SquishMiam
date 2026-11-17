import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SLOTS, type Slot } from "@/lib/plan";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const existante = await db.mealPlanEntry.findUnique({ where: { id } });
  if (!existante || existante.ownerId !== userId) {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const data: { date?: Date; slot?: Slot; servings?: number; recipeId?: string } = {};
  if (typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) && !isNaN(new Date(body.date).getTime())) {
    data.date = new Date(body.date);
  }
  if ((SLOTS as readonly string[]).includes(body.slot)) data.slot = body.slot as Slot;
  if (Number.isInteger(Number(body.servings)) && Number(body.servings) >= 1 && Number(body.servings) <= 12) {
    data.servings = Number(body.servings);
  }
  if (typeof body.recipeId === "string") {
    // La recette de remplacement doit appartenir à l'utilisateur (même règle que POST).
    const recipe = await db.recipe.findFirst({ where: { id: body.recipeId, createdById: userId } });
    if (!recipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
    data.recipeId = body.recipeId;
  }

  try {
    const entry = await db.mealPlanEntry.update({ where: { id }, data });
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "Une case occupe déjà ce créneau" }, { status: 409 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const existante = await db.mealPlanEntry.findUnique({ where: { id } });
  if (!existante || existante.ownerId !== userId) {
    return NextResponse.json({ error: "Entrée introuvable" }, { status: 404 });
  }
  await db.mealPlanEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

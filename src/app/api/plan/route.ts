import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Slot } from "@/lib/plan";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : "";
  const slot = body.slot as Slot;
  const recipeId = typeof body.recipeId === "string" ? body.recipeId : "";
  const servings = Number(body.servings ?? 2);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["DEJEUNER", "DINER"].includes(slot) || !recipeId) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }

  const recipe = await db.recipe.findFirst({ where: { id: recipeId, createdById: userId } });
  if (!recipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });

  const entry = await db.mealPlanEntry.upsert({
    where: {
      ownerId_date_slot: {
        ownerId: userId,
        date: new Date(date),
        slot,
      },
    },
    update: { recipeId, servings },
    create: { date: new Date(date), slot, recipeId, servings, ownerId: userId },
  });
  return NextResponse.json({ entry }, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? "";
  const slot = searchParams.get("slot") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !["DEJEUNER", "DINER"].includes(slot)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  await db.mealPlanEntry.deleteMany({
    where: { ownerId: userId, date: new Date(date), slot: slot as Slot },
  });
  return NextResponse.json({ ok: true });
}

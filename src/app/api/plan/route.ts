import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SLOTS, type Slot } from "@/lib/plan";
import { synchroniserCourses } from "@/lib/sync-courses";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekStart = searchParams.get("weekStart") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart requis (YYYY-MM-DD)" }, { status: 400 });
  }
  const debut = new Date(weekStart);
  if (isNaN(debut.getTime())) return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 7);

  const entries = await db.mealPlanEntry.findMany({
    where: { ownerId: userId, date: { gte: debut, lt: fin } },
    include: { recipe: { select: { id: true, title: true } } },
  });
  return NextResponse.json({ entries });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = typeof body.date === "string" ? body.date : "";
  const slot = body.slot as Slot;
  const recipeId = typeof body.recipeId === "string" ? body.recipeId : "";

  const profil = await db.user.findUnique({ where: { id: userId }, select: { householdSize: true } });
  const servings = Number(body.servings ?? profil?.householdSize ?? 1);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !(SLOTS as readonly string[]).includes(slot) || !recipeId) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  if (!Number.isInteger(servings) || servings < 1 || servings > 12) {
    return NextResponse.json({ error: "Portions invalides (1 à 12)" }, { status: 400 });
  }

  const recipe = await db.recipe.findFirst({ where: { id: recipeId, createdById: userId } });
  if (!recipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });

  // Jamais d'écrasement silencieux : une case occupée est un conflit (409),
  // y compris hors UI (deux onglets, deux appareils).
  // Nouveau index unique : [ownerId, date, slot, order] — nouvelle entrée a order = 0.
  const existante = await db.mealPlanEntry.findUnique({
    where: {
      ownerId_date_slot_order: {
        ownerId: userId,
        date: dateObj,
        slot,
        order: 0,
      },
    },
  });
  if (existante) {
    return NextResponse.json({ error: "Une case occupe déjà ce créneau" }, { status: 409 });
  }

  // Liste de courses vivante : la mutation et la synchronisation de la semaine
  // touchée forment une seule transaction (jamais de liste désynchronisée).
  const entry = await db.$transaction(async (tx) => {
    const created = await tx.mealPlanEntry.create({
      data: { date: dateObj, slot, recipeId, servings, ownerId: userId, order: 0 },
    });
    await synchroniserCourses(tx, userId, [created.date]);
    return created;
  });
  return NextResponse.json({ entry }, { status: 201 });
}

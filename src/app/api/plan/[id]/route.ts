import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { SLOTS, type Slot } from "@/lib/plan";
import { synchroniserCourses } from "@/lib/sync-courses";
import { Prisma } from "@prisma/client";
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
  // Typage explicite en entrée "unchecked" : ce code part du principe que le client
  // Prisma est généré depuis le schéma courant (le build lance `prisma generate`).
  const data: Prisma.MealPlanEntryUncheckedUpdateInput = {};
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
  if (Number.isInteger(Number(body.order)) && Number(body.order) >= 0) {
    data.order = Number(body.order);
  }

  // Date d'origine lue avant l'update : si le repas change de semaine, les DEUX
  // semaines (ancienne et nouvelle) doivent être resynchronisées.
  const dateOrigine = existante.date;
  const dateCible = data.date instanceof Date ? data.date : dateOrigine;

  const dateChanged = data.date instanceof Date && data.date.getTime() !== existante.date.getTime();
  const slotChanged = data.slot && data.slot !== existante.slot;
  const orderChanged = data.order !== undefined && data.order !== existante.order;

  try {
    // Liste de courses vivante : update + synchronisation dans la même transaction.
    const entry = await db.$transaction(async (tx) => {
      // Si date/slot/order changent, gérer le décalage des autres entrées
      if (dateChanged || slotChanged || orderChanged) {
        const targetDate = data.date instanceof Date ? data.date : existante.date;
        const targetSlot: Slot = (data.slot ?? existante.slot) as Slot;
        const targetOrder: number = (data.order ?? existante.order) as number;

        // Décaler les entrées existantes du créneau cible qui ont order >= targetOrder
        await tx.mealPlanEntry.updateMany({
          where: {
            ownerId: userId,
            date: targetDate,
            slot: targetSlot,
            order: { gte: targetOrder },
            NOT: { id: existante.id },
          },
          data: { order: { increment: 1 } },
        });

        // Si l'entrée vient d'un autre créneau, décrémenter l'ancien créneau
        if (dateChanged || slotChanged) {
          await tx.mealPlanEntry.updateMany({
            where: {
              ownerId: userId,
              date: existante.date,
              slot: existante.slot,
              order: { gt: existante.order },
            },
            data: { order: { decrement: 1 } },
          });
        }
        data.order = targetOrder;
      }

      const miseAJour = await tx.mealPlanEntry.update({ where: { id }, data });
      await synchroniserCourses(tx, userId, [dateOrigine, dateCible]);
      return miseAJour;
    });
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
  // Liste de courses vivante : suppression + synchronisation dans la même transaction.
  await db.$transaction(async (tx) => {
    await tx.mealPlanEntry.delete({ where: { id } });
    await synchroniserCourses(tx, userId, [existante.date]);
  });
  return NextResponse.json({ ok: true });
}

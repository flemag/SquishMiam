import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aggregateGroceries, type EntreePlanAvecRecette } from "@/lib/courses";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const weekStart = typeof body.weekStart === "string" ? body.weekStart : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart requis (YYYY-MM-DD)" }, { status: 400 });
  }

  const debut = new Date(weekStart);
  if (isNaN(debut.getTime())) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 7);

  const entries = await db.mealPlanEntry.findMany({
    where: { ownerId: userId, date: { gte: debut, lt: fin } },
    include: {
      recipe: { select: { servings: true, ingredients: true } },
    },
  });

  const entreesTyped = entries.map((e) => ({
    recipe: {
      servings: e.recipe.servings,
      ingredients: e.recipe.ingredients as unknown as EntreePlanAvecRecette["recipe"]["ingredients"],
    },
    servings: e.servings,
  }));

  const groupes = aggregateGroceries(entreesTyped);
  const existants = await db.groceryListItem.findMany({
    where: { ownerId: userId, weekStart: debut },
    select: { nom: true, unite: true },
  });
  const dejaLa = new Set(existants.map((i) => `${i.nom.toLowerCase()}|${i.unite ?? ""}`));

  const aCreer = groupes.flatMap((g) =>
    g.items
      .filter((i) => !dejaLa.has(`${i.nom.toLowerCase()}|${i.unite ?? ""}`))
      .map((i) => ({
        nom: i.nom,
        quantite: i.quantite,
        unite: i.unite,
        rayon: g.rayon,
        weekStart: debut,
        ownerId: userId,
      }))
  );

  if (aCreer.length > 0) {
    await db.groceryListItem.createMany({ data: aCreer });
  }
  return NextResponse.json({ ajoutes: aCreer.length }, { status: 201 });
}

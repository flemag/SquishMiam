import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { calculerNutritionRecette } from "@/lib/nutrition";
import { chercherNutrition } from "@/lib/openfoodfacts";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const ingredients = Array.isArray(body?.ingredients) ? body.ingredients : [];

  if (ingredients.length === 0) {
    return NextResponse.json({ error: "Ingrédients requis" }, { status: 400 });
  }

  // Lookup en parallèle pour chaque ingrédient
  const lookups = await Promise.all(
    ingredients.map(async (ing: { nom: string }) => {
      const nutri = await chercherNutrition(ing.nom);
      return { nom: ing.nom, nutri };
    })
  );

  const lookupMap = new Map(lookups.map((l) => [l.nom, l.nutri]));

  const result = calculerNutritionRecette(
    ingredients.map((ing: { nom: string; quantite?: number; unite?: string }) => ({
      nom: ing.nom,
      quantite: ing.quantite,
      unite: ing.unite,
    })),
    (nom: string) => lookupMap.get(nom) ?? null
  );

  if (!result) {
    return NextResponse.json({ error: "Impossible de calculer la nutrition" }, { status: 422 });
  }

  return NextResponse.json(result);
}
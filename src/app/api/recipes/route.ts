import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipeInput } from "@/lib/recipes-schema";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const recipes = await db.recipe.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ recipes });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = recipeInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Recette invalide" }, { status: 400 });
  }

  const recipe = await db.recipe.create({
    data: { ...parsed.data, createdById: userId },
  });
  return NextResponse.json({ recipe }, { status: 201 });
}

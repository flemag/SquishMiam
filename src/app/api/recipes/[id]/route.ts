import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recipeInput } from "@/lib/recipes-schema";
import { NextResponse } from "next/server";

async function proprietaireOuRefus(id: string, expectedUserId: string) {
  const recipe = await db.recipe.findUnique({ where: { id } });
  if (!recipe || recipe.createdById !== expectedUserId) return null;
  return recipe;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  if (!(await proprietaireOuRefus(id, userId))) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = recipeInput.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Recette invalide" }, { status: 400 });

  const recipe = await db.recipe.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ recipe });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  if (!(await proprietaireOuRefus(id, userId))) {
    return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });
  }

  await db.recipe.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

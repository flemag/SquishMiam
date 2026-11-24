import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { champsModeration, statutBoutique } from "@/lib/admin-boutique";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  const recipe = await db.recipe.findUnique({ where: { id }, select: { id: true } });
  if (!recipe) return NextResponse.json({ error: "Recette introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const publie = body?.publie === true;

  const now = new Date();
  const updated = await db.recipe.update({
    where: { id },
    data: champsModeration(publie, now),
    select: { isPublic: true, validatedAt: true },
  });

  const statut = statutBoutique({ isPublic: updated.isPublic, validatedAt: updated.validatedAt });

  return NextResponse.json({ ok: true, statut });
}
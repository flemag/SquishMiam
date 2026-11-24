import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { exigerAuteur } from "@/lib/recipes";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const publish = body?.publish === true;

  const now = new Date();

  if (publish) {
    // Publication
    let data: Record<string, unknown>;
    try {
      // Auteur : publication normale (en attente de validation)
      await exigerAuteur(id, userId);
      data = {
        isPublic: true,
        publishedAt: now,
        validationCount: 0,
        validators: [],
      };
    } catch {
      // Pas l'auteur : vérifier si admin
      const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
      // Admin : publication immédiate (validée)
      data = { isPublic: true, publishedAt: now, validatedAt: now, validationCount: 0, validators: [] };
    }
    await db.recipe.update({ where: { id }, data });
  } else {
    // Retrait : tout nettoyer (auteur ou admin)
    try {
      await exigerAuteur(id, userId);
    } catch {
      const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (user?.role !== "ADMIN") {
        return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
      }
    }
    await db.recipe.update({
      where: { id },
      data: {
        isPublic: false,
        publishedAt: null,
        validatedAt: null,
        validationCount: 0,
        validators: [],
        sharedWith: [],
      },
    });
  }

  return NextResponse.json({ ok: true });
}
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validerArticle } from "@/lib/boutique-items";

async function exigerAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "ADMIN";
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await exigerAdmin(userId))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const item = await db.boutiqueItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  const validation = validerArticle({
    type: body.type ?? item.type,
    nom: body.nom ?? item.nom,
    prix: body.prix ?? item.prix,
    metadata: body.metadata ?? item.metadata,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.raison }, { status: 400 });
  }

  const updated = await db.boutiqueItem.update({
    where: { id },
    data: {
      ...(typeof body.type === "string" ? { type: body.type } : {}),
      ...(typeof body.nom === "string" ? { nom: body.nom.trim() } : {}),
      ...(typeof body.description === "string" ? { description: body.description.trim() } : {}),
      ...(typeof body.prix === "number" ? { prix: body.prix } : {}),
      ...(body.image !== undefined ? { image: typeof body.image === "string" ? body.image.trim() || null : null } : {}),
      ...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
      ...(typeof body.actif === "boolean" ? { actif: body.actif } : {}),
    },
  });

  return NextResponse.json({ ok: true, article: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await exigerAdmin(userId))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;

  // Vérifier si des utilisateurs ont acheté cet article
  const acheteurs = await db.user.count({ where: { purchasedItems: { has: id } } });
  if (acheteurs > 0) {
    // Désactiver au lieu de supprimer
    await db.boutiqueItem.update({ where: { id }, data: { actif: false } });
    return NextResponse.json({ ok: true, desactive: true });
  }

  await db.boutiqueItem.delete({ where: { id } });
  return NextResponse.json({ ok: true, supprime: true });
}
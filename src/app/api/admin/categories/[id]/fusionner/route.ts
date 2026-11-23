import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decisionFusion } from "@/lib/admin-categories";
import { NextResponse } from "next/server";

const MESSAGES: Record<string, string> = {
  "meme-categorie": "Choisis une catégorie cible différente",
  "source-autre": "La catégorie « Autre » ne peut pas être fusionnée",
  "cible-masquee": "La catégorie cible est masquée",
  inconnue: "Catégorie introuvable",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const cibleId = typeof body?.cibleId === "string" ? body.cibleId.trim() : "";
  if (!cibleId) {
    return NextResponse.json({ error: "Catégorie cible requise" }, { status: 400 });
  }

  const categories = await db.categorie.findMany({
    select: { id: true, nom: true, cle: true, masquee: true },
  });
  if (!categories.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  }
  if (!categories.some((c) => c.id === cibleId)) {
    return NextResponse.json({ error: "Catégorie cible introuvable" }, { status: 404 });
  }

  const decision = decisionFusion(id, cibleId, categories);
  if (!decision.ok) {
    return NextResponse.json({ error: MESSAGES[decision.raison] }, { status: 400 });
  }

  const [deplacement] = await db.$transaction([
    db.recipe.updateMany({ where: { categorieId: id }, data: { categorieId: cibleId } }),
    db.categorie.delete({ where: { id } }),
  ]);

  return NextResponse.json({ deplacees: deplacement.count });
}
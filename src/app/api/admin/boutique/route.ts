import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { validerArticle } from "@/lib/boutique-items";

async function exigerAdmin(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  return user?.role === "ADMIN";
}

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await exigerAdmin(userId))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const articles = await db.boutiqueItem.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ articles });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!(await exigerAdmin(userId))) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide" }, { status: 400 });

  const validation = validerArticle({
    type: body.type,
    nom: body.nom,
    prix: body.prix,
    metadata: body.metadata,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.raison }, { status: 400 });
  }

  const article = await db.boutiqueItem.create({
    data: {
      type: body.type,
      nom: body.nom.trim(),
      description: typeof body.description === "string" ? body.description.trim() : "",
      prix: typeof body.prix === "number" ? body.prix : 0,
      image: typeof body.image === "string" ? body.image.trim() || null : null,
      metadata: body.metadata ?? {},
      actif: body.actif !== false,
    },
  });

  return NextResponse.json({ ok: true, article }, { status: 201 });
}
import { auth } from "@/lib/auth";
import { normaliserCategorie } from "@/lib/categories";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const nom = typeof body?.nom === "string" ? body.nom.trim() : "";
  if (!nom || nom.length > 40) {
    return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });
  }

  const cle = normaliserCategorie(nom);
  if (!cle) return NextResponse.json({ error: "Catégorie invalide" }, { status: 400 });

  const existante = await db.categorie.findUnique({ where: { cle } });
  if (existante) return NextResponse.json({ categorie: existante }, { status: 200 });

  try {
    const categorie = await db.categorie.create({ data: { nom, cle } });
    return NextResponse.json({ categorie }, { status: 201 });
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") {
      const relue = await db.categorie.findUnique({ where: { cle } });
      if (relue) return NextResponse.json({ categorie: relue }, { status: 200 });
    }
    return NextResponse.json({ error: "Création impossible" }, { status: 500 });
  }
}

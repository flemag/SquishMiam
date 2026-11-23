import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIE_AUTRE } from "@/lib/categories";
import { decisionRenommage } from "@/lib/admin-categories";
import { NextResponse } from "next/server";

const SELECTION = { id: true, nom: true, cle: true, masquee: true } as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existante = await db.categorie.findUnique({ where: { id }, select: { id: true } });
  if (!existante) return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  if ("nom" in body) {
    if (typeof body.nom !== "string") {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    const nom = body.nom.trim();
    const categories = await db.categorie.findMany({ select: SELECTION });
    const decision = decisionRenommage(nom, id, categories);
    if (!decision.ok) {
      if (decision.raison === "vide" || decision.raison === "trop-long") {
        return NextResponse.json(
          { error: "Le nom doit contenir 1 à 60 caractères" },
          { status: 400 }
        );
      }
      // decision.raison === "collision" (type narrowed by exclusion)
      const collisionDecision = decision as { ok: false; raison: "collision"; categorie: { id: string; nom: string } };
      return NextResponse.json(
        { error: "Cette catégorie existe déjà", collision: collisionDecision.categorie },
        { status: 409 }
      );
    }

    const categorie = await db.categorie.update({
      where: { id },
      data: { nom, cle: decision.cle },
      select: SELECTION,
    });
    return NextResponse.json({ categorie });
  }

  if ("masquee" in body) {
    if (typeof body.masquee !== "boolean") {
      return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
    }
    if (id === CATEGORIE_AUTRE && body.masquee) {
      return NextResponse.json(
        { error: "La catégorie « Autre » ne peut pas être masquée" },
        { status: 400 }
      );
    }

    const categorie = await db.categorie.update({
      where: { id },
      data: { masquee: body.masquee },
      select: SELECTION,
    });
    return NextResponse.json({ categorie });
  }

  return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
}
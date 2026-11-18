import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RAYONS } from "@/lib/rayons";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const ARTICLE_DU_PLANNING = "Article du planning — seule la quantité est modifiable";
const DEJA_DANS_LA_LISTE = "Déjà dans la liste pour cette semaine";

// Même convention de clé que POST /api/courses/item et la réconciliation.
function cleDeFusion(nom: string, unite: string | null): string {
  return `${nom.trim().toLowerCase()}|${unite ?? ""}`;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const item = await db.groceryListItem.findUnique({ where: { id } });
  if (!item || item.ownerId !== userId) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  const corps = await req.json().catch(() => null);
  const body = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;

  // Nom, unité et rayon décrivent l'article : réservés aux lignes ajoutées à la main.
  const toucheIdentite = body.nom !== undefined || body.unite !== undefined || body.rayon !== undefined;
  if (toucheIdentite && item.source !== "MANUEL") {
    return NextResponse.json({ error: ARTICLE_DU_PLANNING }, { status: 400 });
  }

  const data: Prisma.GroceryListItemUncheckedUpdateInput = {};
  // Valeurs cibles de l'identité, pour la détection de collision avant écriture.
  let nomCible = item.nom;
  let uniteCible = item.unite;
  let identiteModifiee = false;

  if ("checked" in body) {
    if (typeof body.checked !== "boolean") {
      return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
    }
    data.checked = body.checked;
  }

  if ("masquee" in body) {
    if (typeof body.masquee !== "boolean") {
      return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
    }
    data.masquee = body.masquee;
  }

  if ("quantite" in body) {
    if (body.quantite === null) {
      data.quantite = null;
    } else if (typeof body.quantite === "number" && Number.isFinite(body.quantite) && body.quantite > 0) {
      data.quantite = body.quantite;
    } else {
      return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
    }
  }

  if ("nom" in body) {
    const nom = typeof body.nom === "string" ? body.nom.trim() : "";
    if (!nom || nom.length > 60) {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    data.nom = nom;
    nomCible = nom;
    identiteModifiee = true;
  }

  if ("unite" in body) {
    if (body.unite === null) {
      data.unite = null;
      uniteCible = null;
      identiteModifiee = true;
    } else if (typeof body.unite === "string") {
      const unite = body.unite.trim();
      if (unite.length > 20) {
        return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
      }
      data.unite = unite || null;
      uniteCible = unite || null;
      identiteModifiee = true;
    } else {
      return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
    }
  }

  if ("rayon" in body) {
    if (typeof body.rayon !== "string" || !(RAYONS as readonly string[]).includes(body.rayon)) {
      return NextResponse.json({ error: "Rayon invalide" }, { status: 400 });
    }
    data.rayon = body.rayon;
  }

  // Renommer ou changer l'unité peut heurter une autre ligne de la semaine : la
  // comparaison se fait en JS sur la clé normalisée (l'index SQL est sensible à la
  // casse), et seule une ligne visible bloque.
  if (identiteModifiee) {
    const cle = cleDeFusion(nomCible, uniteCible);
    const autres = await db.groceryListItem.findMany({
      where: { ownerId: userId, weekStart: item.weekStart, NOT: { id } },
      select: { id: true, nom: true, unite: true, masquee: true },
    });
    if (autres.some((l) => !l.masquee && cleDeFusion(l.nom, l.unite) === cle)) {
      return NextResponse.json({ error: DEJA_DANS_LA_LISTE }, { status: 409 });
    }
  }

  try {
    const updated = await db.groceryListItem.update({ where: { id }, data });
    return NextResponse.json({ item: updated });
  } catch (err) {
    // Filet de sécurité : l'index unique peut encore refuser une ligne créée entre-temps.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: DEJA_DANS_LA_LISTE }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const item = await db.groceryListItem.findUnique({ where: { id } });
  if (!item || item.ownerId !== userId) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  // Ligne manuelle : suppression réelle. Ligne du plan : simple masquage, pour que
  // la réconciliation ne la recrée pas et que « révéler » reste possible.
  if (item.source === "MANUEL") {
    await db.groceryListItem.delete({ where: { id } });
    return NextResponse.json({ traitement: "supprimee" });
  }
  await db.groceryListItem.update({ where: { id }, data: { masquee: true } });
  return NextResponse.json({ traitement: "masquee" });
}

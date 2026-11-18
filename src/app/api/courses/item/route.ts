import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapToRayon, RAYONS } from "@/lib/rayons";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const DEJA_DANS_LA_LISTE = "Déjà dans la liste pour cette semaine";

// Même convention de clé que aggregateGroceries et la réconciliation.
function cleDeFusion(nom: string, unite: string | null): string {
  return `${nom.trim().toLowerCase()}|${unite ?? ""}`;
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const corps = await req.json().catch(() => null);
  const body = (corps && typeof corps === "object" ? corps : {}) as Record<string, unknown>;

  const weekStart = typeof body.weekStart === "string" ? body.weekStart : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: "weekStart requis (YYYY-MM-DD)" }, { status: 400 });
  }
  const debut = new Date(weekStart);
  if (isNaN(debut.getTime())) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }

  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom || nom.length > 60) {
    return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
  }

  let quantite: number | null = null;
  if (body.quantite !== undefined) {
    if (typeof body.quantite !== "number" || !Number.isFinite(body.quantite) || body.quantite <= 0) {
      return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
    }
    quantite = body.quantite;
  }

  let unite: string | null = null;
  if (body.unite !== undefined) {
    if (typeof body.unite !== "string") {
      return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
    }
    unite = body.unite.trim() || null;
    if (unite && unite.length > 20) {
      return NextResponse.json({ error: "Unité invalide" }, { status: 400 });
    }
  }

  const rayon =
    typeof body.rayon === "string" && (RAYONS as readonly string[]).includes(body.rayon)
      ? body.rayon
      : mapToRayon(nom);

  // Comparaison en JS : l'index unique en base est sensible à la casse, pas cette clé.
  const existantes = await db.groceryListItem.findMany({
    where: { ownerId: userId, weekStart: debut },
    select: { id: true, nom: true, unite: true, masquee: true },
  });
  const cle = cleDeFusion(nom, unite);
  // Une ligne visible prime toujours : si la clé existe en double (casse différente),
  // on refuse plutôt que de convertir une ligne masquée à côté d'une visible.
  const collision =
    existantes.find((l) => cleDeFusion(l.nom, l.unite) === cle && !l.masquee) ??
    existantes.find((l) => cleDeFusion(l.nom, l.unite) === cle);

  if (collision && !collision.masquee) {
    return NextResponse.json({ error: DEJA_DANS_LA_LISTE }, { status: 409 });
  }

  if (collision) {
    // Ligne masquée : on la réintègre en ligne manuelle avec les valeurs de l'appel.
    const item = await db.groceryListItem.update({
      where: { id: collision.id },
      data: { source: "MANUEL", quantite, unite, rayon, masquee: false, checked: false },
    });
    return NextResponse.json({ item }, { status: 201 });
  }

  try {
    const item = await db.groceryListItem.create({
      data: { nom, quantite, unite, rayon, weekStart: debut, ownerId: userId, source: "MANUEL" },
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    // Filet de sécurité : l'index unique peut encore refuser une ligne créée entre-temps.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: DEJA_DANS_LA_LISTE }, { status: 409 });
    }
    throw err;
  }
}

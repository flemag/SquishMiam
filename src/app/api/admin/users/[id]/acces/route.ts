import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleDAccesCourante, prolongerAcces } from "@/lib/admin-acces";
import { NextResponse } from "next/server";

const DUREES = new Set([7, 30, 90]);

async function adminCourant(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return { userId };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminCourant();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !("jours" in body)) {
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
  }
  const jours = body.jours;
  if (jours !== null && !DUREES.has(jours)) {
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
  }

  const cible = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const cles = await db.licenseKey.findMany({
    where: { activatedById: id, status: "ACTIVE" },
    select: { id: true, status: true, expiresAt: true, activatedAt: true },
  });
  const cle = cleDAccesCourante(cles);
  if (!cle) {
    return NextResponse.json({ error: "Aucune clé active à prolonger" }, { status: 409 });
  }
  if (cle.expiresAt === null) {
    return NextResponse.json({ error: "Cet accès est déjà illimité" }, { status: 409 });
  }

  const expiresAt = prolongerAcces(cle.expiresAt, jours, new Date());
  const miseAJour = await db.licenseKey.update({
    where: { id: cle.id },
    data: { expiresAt },
    select: { id: true, expiresAt: true },
  });
  return NextResponse.json({ cle: miseAJour });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminCourant();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  if (id === admin.userId) {
    return NextResponse.json(
      { error: "Tu ne peux pas révoquer ton propre accès" },
      { status: 400 }
    );
  }

  const cible = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const resultat = await db.licenseKey.updateMany({
    where: { activatedById: id, status: "ACTIVE" },
    data: { status: "REVOKED" },
  });
  if (resultat.count === 0) {
    return NextResponse.json({ error: "Aucune clé active à révoquer" }, { status: 409 });
  }
  return NextResponse.json({ cles: resultat.count });
}
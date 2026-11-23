import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (role !== "USER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }
  if (id === userId) {
    return NextResponse.json(
      { error: "Tu ne peux pas changer ton propre rôle" },
      { status: 400 }
    );
  }

  const cible = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const user = await db.user.update({
    where: { id },
    data: { role },
    select: { id: true, role: true },
  });
  return NextResponse.json({ user });
}
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createKeys } from "@/lib/keys-service";
import { licenseStatus } from "@/lib/licenses";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const keys = await db.licenseKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, code: true, durationDays: true, status: true, expiresAt: true, activatedAt: true, createdAt: true },
  });

  const now = new Date();
  return NextResponse.json({
    keys: keys.map((k) => ({ ...k, statut: licenseStatus({ status: k.status, expiresAt: k.expiresAt }, now) })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const count = Number(body.count);
  const durationDays = body.durationDays === null || body.durationDays === undefined ? null : Number(body.durationDays);
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    return NextResponse.json({ error: "Nombre de clés invalide (1 à 100)" }, { status: 400 });
  }
  if (durationDays !== null && (!Number.isInteger(durationDays) || durationDays < 1)) {
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
  }

  const created = await createKeys(count, durationDays);
  return NextResponse.json({ keys: created }, { status: 201 });
}

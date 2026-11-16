import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activationExpiry } from "@/lib/licenses";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code) {
    return NextResponse.json({ error: "Code requis" }, { status: 400 });
  }

  const key = await db.licenseKey.findUnique({ where: { code } });
  if (!key || key.status !== "UNUSED") {
    return NextResponse.json({ error: "Clé inconnue ou déjà utilisée" }, { status: 404 });
  }

  const now = new Date();
  // updateMany conditionnel : seule une clé encore UNUSED passe (pas de course perdue)
  const res = await db.licenseKey.updateMany({
    where: { id: key.id, status: "UNUSED" },
    data: {
      status: "ACTIVE",
      activatedAt: now,
      expiresAt: activationExpiry(now, key.durationDays),
      activatedById: userId,
    },
  });
  if (res.count === 0) {
    return NextResponse.json({ error: "Clé inconnue ou déjà utilisée" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const theme = typeof body?.theme === "string" ? body.theme : undefined;
  const accessoire = typeof body?.accessoire === "string" ? body.accessoire : undefined;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { purchasedItems: true },
  });
  if (!user) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const data: Record<string, unknown> = {};

  if (theme !== undefined) {
    if (theme === "") {
      data.activeTheme = null;
    } else if (user.purchasedItems.includes(theme)) {
      data.activeTheme = theme;
    } else {
      return NextResponse.json({ error: "Article non possédé" }, { status: 403 });
    }
  }

  if (accessoire !== undefined) {
    if (accessoire === "") {
      data.activeAccessory = null;
    } else if (user.purchasedItems.includes(accessoire)) {
      data.activeAccessory = accessoire;
    } else {
      return NextResponse.json({ error: "Article non possédé" }, { status: 403 });
    }
  }

  await db.user.update({ where: { id: userId }, data });

  return NextResponse.json({ ok: true });
}
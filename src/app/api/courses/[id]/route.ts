import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = await params;
  const item = await db.groceryListItem.findUnique({ where: { id } });
  if (!item || item.ownerId !== userId) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const checked = Boolean(body.checked);

  const updated = await db.groceryListItem.update({ where: { id }, data: { checked } });
  return NextResponse.json({ item: updated });
}

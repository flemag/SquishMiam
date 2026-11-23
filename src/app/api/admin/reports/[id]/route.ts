import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { exigerAdmin } from "@/lib/admin-session";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin();

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body?.status;

  if (!status || !["REVIEWED", "DISMISSED"].includes(status)) {
    return NextResponse.json({ error: "Statut invalide (REVIEWED ou DISMISSED)" }, { status: 400 });
  }

  const report = await db.report.findUnique({ where: { id } });
  if (!report) return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });

  const updated = await db.report.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });

  return NextResponse.json({ report: updated });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await exigerAdmin();

  const { id } = await params;

  const report = await db.report.findUnique({
    where: { id },
    select: { id: true, recipeId: true },
  });
  if (!report) return NextResponse.json({ error: "Signalement introuvable" }, { status: 404 });

  // Supprimer le signalement et la recette associée
  await db.$transaction([
    db.report.delete({ where: { id } }),
    db.recipe.delete({ where: { id: report.recipeId } }),
  ]);

  return NextResponse.json({ ok: true });
}
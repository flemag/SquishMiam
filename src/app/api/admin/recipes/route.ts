import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { statutBoutique } from "@/lib/admin-boutique";

export async function GET(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const recherche = searchParams.get("recherche")?.trim() ?? "";

  const where: Record<string, unknown> = {};
  if (recherche) {
    where.OR = [
      { title: { contains: recherche, mode: "insensitive" } },
      { createdBy: { name: { contains: recherche, mode: "insensitive" } } },
      { createdBy: { email: { contains: recherche, mode: "insensitive" } } },
    ];
  }

  const recipes = await db.recipe.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      isPublic: true,
      publishedAt: true,
      validatedAt: true,
      validationCount: true,
      createdAt: true,
      createdBy: { select: { name: true, email: true } },
    },
  });

  const recettes = recipes.map((r) => ({
    id: r.id,
    titre: r.title,
    auteur: r.createdBy.name ?? r.createdBy.email,
    statut: statutBoutique({ isPublic: r.isPublic, validatedAt: r.validatedAt }),
    validations: r.validationCount,
    isPublic: r.isPublic,
    publishedAt: r.publishedAt,
    validatedAt: r.validatedAt,
    createdAt: r.createdAt,
  }));

  return NextResponse.json({ recettes });
}
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const categorieId = searchParams.get("categorieId") || undefined;
  const search = searchParams.get("search") || undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
  const skip = (page - 1) * limit;

  const where: {
  validatedAt: { not: null };
  isPublic: boolean;
  categorieId?: string;
  OR?: Array<{ title?: { contains: string; mode: "insensitive" }; tags?: { hasSome: string[] } }>;
} = {
    validatedAt: { not: null }, // seulement recettes validées
    isPublic: true,
  };

  if (categorieId) where.categorieId = categorieId;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { tags: { hasSome: [search] } },
    ];
  }

  const [recipes, total] = await Promise.all([
    db.recipe.findMany({
      where,
      select: {
        id: true,
        title: true,
        minutes: true,
        tags: true,
        validationCount: true,
        publishedAt: true,
        createdBy: { select: { id: true, name: true, image: true } },
        categorie: { select: { id: true, nom: true } },
      },
      orderBy: [{ validationCount: "desc" }, { publishedAt: "desc" }],
      skip,
      take: limit,
    }),
    db.recipe.count({ where }),
  ]);

  return NextResponse.json({
    recipes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
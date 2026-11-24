import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const articles = await db.boutiqueItem.findMany({
    where: { actif: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    articles: articles.map((a) => ({
      id: a.id,
      type: a.type,
      nom: a.nom,
      description: a.description,
      prix: a.prix,
      image: a.image,
      metadata: a.metadata,
      createdAt: a.createdAt,
    })),
  });
}
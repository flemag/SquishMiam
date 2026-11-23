import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import BoutiqueClient from "@/components/boutique/boutique-client";

export default async function BoutiquePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const [categories, recettes] = await Promise.all([
    db.categorie.findMany({
      where: { masquee: false },
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
    db.recipe.findMany({
      where: {
        isPublic: true,
        validatedAt: { not: null },
      },
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
      take: 20,
    }),
  ]);

  // Convertir publishedAt en string ISO
  const recettesWithStringDate = recettes.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }));

  return (
    <main>
      <BoutiqueClient
        categories={categories}
        recettes={recettesWithStringDate}
      />
    </main>
  );
}
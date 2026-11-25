import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import BoutiquePageVue from "@/components/boutique/boutique-page";

export default async function BoutiquePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const [categories, recettes, articles, user] = await Promise.all([
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
        boostedUntil: true,
        createdBy: { select: { id: true, name: true, image: true } },
        categorie: { select: { id: true, nom: true } },
      },
      orderBy: [{ validationCount: "desc" }, { publishedAt: "desc" }],
      take: 20,
    }),
    db.boutiqueItem.findMany({
      where: { actif: true },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findUnique({ where: { id: userId }, select: { tokens: true, purchasedItems: true } }),
  ]);

  // Convertir publishedAt en string ISO
  const recettesWithStringDate = recettes.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    boostedUntil: r.boostedUntil ? r.boostedUntil.toISOString() : null,
  }));

  const articlesVue = articles.map((a) => ({
    id: a.id,
    type: a.type,
    nom: a.nom,
    description: a.description,
    prix: a.prix,
    image: a.image,
    metadata: a.metadata,
  }));

  return (
    <main>
      <BoutiquePageVue
        categories={categories}
        recettes={recettesWithStringDate}
        articles={articlesVue}
        tokens={user?.tokens ?? 0}
        purchasedItems={user?.purchasedItems ?? []}
      />
    </main>
  );
}
import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import BoutiqueCatalogueClient from "@/components/admin/boutique-catalogue-client";

export default async function AdminBoutiqueCataloguePage() {
  await exigerAdmin();

  const [articles, users] = await Promise.all([
    db.boutiqueItem.findMany({ orderBy: { createdAt: "desc" } }),
    db.user.findMany({ where: { purchasedItems: { isEmpty: false } }, select: { purchasedItems: true } }),
  ]);

  const allPurchased = new Set(users.flatMap((u) => u.purchasedItems));

  const articlesVue = articles.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
    dejaAchete: allPurchased.has(a.id),
  }));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-miamz-vert">Catalogue boutique</h1>
      <p className="mb-6 text-sm text-texte-doux">
        Crée, modifie ou désactive des articles (thèmes, accessoires, packs).
      </p>
      <BoutiqueCatalogueClient articles={articlesVue} />
    </div>
  );
}
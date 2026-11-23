import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import CategoriesClient from "@/components/admin/categories-client";

export default async function AdminCategoriesPage() {
  await exigerAdmin();

  const categories = await db.categorie.findMany({
    select: {
      id: true,
      nom: true,
      cle: true,
      masquee: true,
      _count: { select: { recettes: true } },
    },
  });
  const vues = categories
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      cle: c.cle,
      masquee: c.masquee,
      recettes: c._count.recettes,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-miamz-vert">Catégories</h1>
      <p className="mb-6 text-sm text-texte-doux">
        Renomme, masque ou fusionne. Fusionner déplace les recettes puis supprime la catégorie
        source.
      </p>
      <CategoriesClient categories={vues} />
    </div>
  );
}
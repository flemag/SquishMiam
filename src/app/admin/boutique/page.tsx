import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import { statutBoutique } from "@/lib/admin-boutique";
import BoutiqueAdmin from "@/components/admin/boutique-admin";

export default async function AdminBoutiquePage() {
  await exigerAdmin();

  const recipes = await db.recipe.findMany({
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
  }));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-miamz-vert">Boutique</h1>
      <p className="mb-6 text-sm text-texte-doux">
        L&apos;admin publie sans attendre les 3 validations. Modère les recettes ici.
      </p>
      <BoutiqueAdmin recettes={recettes} />
    </div>
  );
}
import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import { cleDAccesCourante } from "@/lib/admin-acces";
import UtilisateursClient, {
  type UtilisateurAdminVue,
} from "@/components/admin/utilisateurs-client";

export default async function AdminUtilisateursPage() {
  const adminId = await exigerAdmin();
  const maintenant = new Date();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { recipes: true } },
      licenseKeys: {
        where: { status: "ACTIVE" },
        select: { id: true, status: true, expiresAt: true, activatedAt: true },
      },
    },
  });

  const vues: UtilisateurAdminVue[] = users.map((u) => {
    const cle = cleDAccesCourante(u.licenseKeys);
    const acces: UtilisateurAdminVue["acces"] = !cle
      ? "aucun"
      : cle.expiresAt === null
        ? "illimite"
        : cle.expiresAt > maintenant
          ? "actif"
          : "expire";

    return {
      id: u.id,
      nom: u.name,
      email: u.email,
      role: u.role,
      inscription: u.createdAt.toLocaleDateString("fr-FR"),
      recettes: u._count.recipes,
      acces,
      expireLe: cle?.expiresAt ? cle.expiresAt.toLocaleDateString("fr-FR") : null,
      estSoi: u.id === adminId,
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-miamz-vert">Utilisateurs</h1>
      <p className="mb-6 text-sm text-texte-doux">
        {vues.length} compte(s), du plus récent au plus ancien. Change un rôle, prolonge ou coupe
        un accès.
      </p>
      <UtilisateursClient utilisateurs={vues} />
    </div>
  );
}
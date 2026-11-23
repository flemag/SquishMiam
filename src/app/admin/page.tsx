import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import { regrouperActiviteParSemaine } from "@/lib/admin-stats";
import { weekStart } from "@/lib/plan";

export default async function AdminOverviewPage() {
  await exigerAdmin();

  const maintenant = new Date();
  const debutSemaine = weekStart(maintenant);
  const finSemaine = new Date(debutSemaine);
  finSemaine.setUTCDate(finSemaine.getUTCDate() + 7);
  const debutMois = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
  const debutFenetre = new Date(debutSemaine);
  debutFenetre.setUTCDate(debutFenetre.getUTCDate() - 35);

  const [
    totalUtilisateurs,
    nouveauxMois,
    accesActifs,
    clesDisponibles,
    totalRecettes,
    repasSemaine,
    courses,
    dernieres,
    parCategorie,
    inscriptions,
    recettesCreees,
    clesCreees,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: debutMois } } }),
    db.user.count({
      where: {
        licenseKeys: {
          some: {
            status: "ACTIVE",
            OR: [{ expiresAt: null }, { expiresAt: { gt: maintenant } }],
          },
        },
      },
    }),
    db.licenseKey.count({ where: { status: "UNUSED" } }),
    db.recipe.count(),
    db.mealPlanEntry.count({ where: { date: { gte: debutSemaine, lt: finSemaine } } }),
    db.groceryListItem.count({ where: { checked: false, masquee: false } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, createdAt: true },
    }),
    db.categorie.findMany({
      select: { id: true, nom: true, _count: { select: { recettes: true } } },
    }),
    db.user.findMany({ where: { createdAt: { gte: debutFenetre } }, select: { createdAt: true } }),
    db.recipe.findMany({ where: { createdAt: { gte: debutFenetre } }, select: { createdAt: true } }),
    db.licenseKey.findMany({ where: { createdAt: { gte: debutFenetre } }, select: { createdAt: true } }),
  ]);

  const activite = regrouperActiviteParSemaine(
    {
      inscriptions: inscriptions.map((u) => u.createdAt),
      recettes: recettesCreees.map((r) => r.createdAt),
      cles: clesCreees.map((k) => k.createdAt),
    },
    6,
    maintenant
  );
  const totalActivite = activite.reduce(
    (n, s) => n + s.inscriptions + s.recettes + s.cles,
    0
  );
  const categoriesUtilisees = parCategorie
    .map((c) => ({ id: c.id, nom: c.nom, nombre: c._count.recettes }))
    .filter((c) => c.nombre > 0)
    .sort((a, b) => b.nombre - a.nombre);
  const topCategories = categoriesUtilisees.slice(0, 5);
  const resteCategories = categoriesUtilisees.slice(5).reduce((n, c) => n + c.nombre, 0);
  const maxActivite = Math.max(
    1,
    ...activite.flatMap((s) => [s.inscriptions, s.recettes, s.cles])
  );
  const hauteur = (valeur: number) => `${Math.round((valeur / maxActivite) * 100)}%`;
  const labelSemaine = (debut: string) => `${debut.slice(8, 10)}/${debut.slice(5, 7)}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="mb-1 text-2xl font-semibold text-miamz-vert">Vue d&apos;ensemble</h1>
        <p className="text-sm text-texte-doux">L&apos;usage de Miamz en un coup d&apos;œil.</p>
      </div>

      <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <CarteStat
          libelle="Utilisateurs"
          valeur={totalUtilisateurs}
          detail={nouveauxMois > 0 ? `+${nouveauxMois} ce mois` : "Aucun nouveau ce mois"}
        />
        <CarteStat libelle="Accès actifs" valeur={accesActifs} detail="Clés valides" />
        <CarteStat libelle="Clés disponibles" valeur={clesDisponibles} detail="Prêtes à distribuer" />
        <CarteStat libelle="Recettes" valeur={totalRecettes} detail="Toutes catégories" />
        <CarteStat libelle="Repas cette semaine" valeur={repasSemaine} detail="Tous comptes" />
        <CarteStat libelle="Courses à cocher" valeur={courses} detail="Non masquées" />
      </section>

      <section className="carte p-4 sm:p-6">
        <h2 className="mb-1 font-medium text-foreground">Activité des 6 dernières semaines</h2>
        <p className="mb-4 text-xs text-texte-tres-doux">Semaines du lundi au dimanche (UTC).</p>
        {totalActivite === 0 ? (
          <p className="text-sm text-texte-tres-doux">Aucune activité sur la période.</p>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-3 text-xs text-texte-doux">
              <Legende couleur="#A8E6CF" label="Inscriptions" />
              <Legende couleur="#C9B6E4" label="Recettes" />
              <Legende couleur="#E07A5F" label="Clés" />
            </div>
            <div className="flex items-end gap-2 sm:gap-3" aria-hidden="true">
              {activite.map((s) => (
                <div key={s.debut} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end justify-center gap-1">
                    <div
                      className="w-2 rounded-t bg-[#A8E6CF]"
                      style={{ height: hauteur(s.inscriptions) }}
                    />
                    <div
                      className="w-2 rounded-t bg-[#C9B6E4]"
                      style={{ height: hauteur(s.recettes) }}
                    />
                    <div className="w-2 rounded-t bg-[#E07A5F]" style={{ height: hauteur(s.cles) }} />
                  </div>
                  <span className="text-[10px] text-texte-tres-doux">{labelSemaine(s.debut)}</span>
                </div>
              ))}
            </div>
            <ul className="sr-only">
              {activite.map((s) => (
                <li key={s.debut}>
                  Semaine du {labelSemaine(s.debut)} : {s.inscriptions} inscription(s),{" "}
                  {s.recettes} recette(s), {s.cles} clé(s).
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="carte p-4 sm:p-6">
        <h2 className="mb-4 font-medium text-foreground">Catégories les plus utilisées</h2>
        {topCategories.length === 0 ? (
          <p className="text-sm text-texte-tres-doux">Aucune recette classée pour le moment.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {topCategories.map((c) => (
              <li key={c.id}>
                <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{c.nom}</span>
                  <span className="shrink-0 text-texte-doux">{c.nombre}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-[#A8E6CF]"
                    style={{
                      width: `${Math.round((c.nombre / topCategories[0].nombre) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        {resteCategories > 0 && (
          <p className="mt-3 text-xs text-texte-tres-doux">
            Et {resteCategories} recette(s) dans les autres catégories.
          </p>
        )}
      </section>

      <section className="carte p-4 sm:p-6">
        <h2 className="mb-2 font-medium text-foreground">Dernières inscriptions</h2>
        {dernieres.length === 0 ? (
          <p className="text-sm text-texte-tres-doux">Aucun compte.</p>
        ) : (
          <ul className="divide-y divide-bordure">
            {dernieres.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{u.name ?? u.email}</span>
                  {u.name && (
                    <span className="block truncate text-xs text-texte-doux">{u.email}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-texte-tres-doux">
                  {u.createdAt.toLocaleDateString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CarteStat({ libelle, valeur, detail }: { libelle: string; valeur: number; detail: string }) {
  return (
    <div className="carte p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-texte-tres-doux">{libelle}</p>
      <p className="mt-1 text-2xl font-semibold text-[#4A6741]">{valeur}</p>
      <p className="mt-1 text-xs text-texte-doux">{detail}</p>
    </div>
  );
}

function Legende({ couleur, label }: { couleur: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: couleur }} />
      {label}
    </span>
  );
}
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDateIso, formatJourFr, getWeekDates, weekStart } from "@/lib/plan";
import { RAYONS } from "@/lib/rayons";
import ListeCourses from "@/components/courses/liste";
import AnalyseMiamz from "@/components/miamz/analyse";

type ItemVue = {
  id: string;
  nom: string;
  quantite: number | null;
  unite: string | null;
  rayon: string;
  source: "PLAN" | "MANUEL";
  checked: boolean;
};

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const { semaine } = await searchParams;
  const paramsValides =
    semaine && /^\d{4}-\d{2}-\d{2}$/.test(semaine) && !isNaN(new Date(semaine).getTime());
  const ref = paramsValides ? new Date(semaine) : new Date();
  const debut = weekStart(ref);
  const dates = getWeekDates(debut);

  const items = await db.groceryListItem.findMany({
    where: { ownerId: userId, weekStart: debut },
    orderBy: [{ rayon: "asc" }, { nom: "asc" }],
  });

  const prev = new Date(debut);
  prev.setUTCDate(prev.getUTCDate() - 7);
  const next = new Date(debut);
  next.setUTCDate(next.getUTCDate() + 7);

  const versVue = (i: (typeof items)[number]): ItemVue => ({
    id: i.id,
    nom: i.nom,
    quantite: i.quantite,
    unite: i.unite,
    rayon: i.rayon,
    source: i.source,
    checked: i.checked,
  });

  // Les lignes masquées sortent des groupes et du compteur : la liste visible
  // reste honnête, elles vivent dans leur section dédiée en bas de page.
  const visibles = items.filter((i) => !i.masquee);
  const masquees = items.filter((i) => i.masquee);

  // groupes dans l'ordre du dictionnaire de rayons (pas l'ordre alphabétique SQL)
  const rayonsOrdonnes = [...new Set(visibles.map((i) => i.rayon))].sort(
    (a, b) => RAYONS.indexOf(a as (typeof RAYONS)[number]) - RAYONS.indexOf(b as (typeof RAYONS)[number])
  );
  const groupes = rayonsOrdonnes.map((rayon) => ({
    rayon,
    items: visibles.filter((i) => i.rayon === rayon).map(versVue),
  }));

  const coches = visibles.filter((i) => i.checked).length;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-miamz-vert">Liste de courses</h1>
          <p className="text-sm text-texte-doux">
            Semaine du {formatJourFr(dates[0])} · {coches}/{visibles.length} cochés
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AnalyseMiamz portee="courses" semaine={formatDateIso(debut)} label="Astuces courses" />
          <a
            href={`/courses?semaine=${formatDateIso(prev)}`}
            className="bouton-secondaire"
          >
            ←
          </a>
          <a
            href={`/courses?semaine=${formatDateIso(next)}`}
            className="bouton-secondaire"
          >
            →
          </a>
        </div>
      </div>

      <ListeCourses
        weekStart={formatDateIso(debut)}
        groupes={groupes}
        masquees={masquees.map(versVue)}
      />
    </main>
  );
}

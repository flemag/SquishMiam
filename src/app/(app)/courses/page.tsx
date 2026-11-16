import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDateIso, formatJourFr, getWeekDates, weekStart } from "@/lib/plan";
import { formatQuantite } from "@/lib/courses";
import { RAYONS } from "@/lib/rayons";
import ListeCourses from "@/components/courses/liste";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const { semaine } = await searchParams;
  const ref = semaine && /^\d{4}-\d{2}-\d{2}$/.test(semaine) ? new Date(semaine) : new Date();
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

  // groupes dans l'ordre du dictionnaire de rayons (pas l'ordre alphabétique SQL)
  const rayonsOrdonnes = [...new Set(items.map((i) => i.rayon))].sort(
    (a, b) => RAYONS.indexOf(a as (typeof RAYONS)[number]) - RAYONS.indexOf(b as (typeof RAYONS)[number])
  );
  const groupes = rayonsOrdonnes.map((rayon) => ({
    rayon,
    items: items.filter((i) => i.rayon === rayon),
  }));

  const coches = items.filter((i) => i.checked).length;

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#4A6741]">Liste de courses</h1>
          <p className="text-sm text-gray-500">
            Semaine du {formatJourFr(dates[0])} · {coches}/{items.length} cochés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/courses?semaine=${formatDateIso(prev)}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-[#A8E6CF]/30"
          >
            ←
          </a>
          <a
            href={`/courses?semaine=${formatDateIso(next)}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-[#A8E6CF]/30"
          >
            →
          </a>
        </div>
      </div>

      <ListeCourses
        weekStart={formatDateIso(debut)}
        groupes={groupes.map((g) => ({
          rayon: g.rayon,
          items: g.items.map((i) => ({
            id: i.id,
            nom: i.nom,
            affichage: i.quantite !== null ? formatQuantite(i.quantite, i.unite) : i.nom,
            checked: i.checked,
          })),
        }))}
      />
    </main>
  );
}

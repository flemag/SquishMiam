import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { formatDateIso, formatJourFr, getWeekDates, SLOTS, SLOT_LABELS, weekStart } from "@/lib/plan";
import GrillePlan from "@/components/plan/grille";

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ semaine?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const { semaine } = await searchParams;
  const ref = semaine && /^\d{4}-\d{2}-\d{2}$/.test(semaine) ? new Date(semaine) : new Date();
  const dates = getWeekDates(ref);
  const debut = weekStart(ref);
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 7);

  const [entries, recipes] = await Promise.all([
    db.mealPlanEntry.findMany({
      where: { ownerId: userId, date: { gte: debut, lt: fin } },
      include: { recipe: { select: { id: true, title: true } } },
    }),
    db.recipe.findMany({
      where: { createdById: userId },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    }),
  ]);

  const prev = new Date(debut);
  prev.setUTCDate(prev.getUTCDate() - 7);
  const next = new Date(debut);
  next.setUTCDate(next.getUTCDate() + 7);

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#4A6741]">La semaine des repas</h1>
          <p className="text-sm text-gray-500">
            {formatJourFr(dates[0])} → {formatJourFr(dates[6])}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/plan?semaine=${formatDateIso(prev)}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-[#A8E6CF]/30"
          >
            ← Semaine
          </a>
          <a
            href={`/plan?semaine=${formatDateIso(next)}`}
            className="rounded-full bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-[#A8E6CF]/30"
          >
            Semaine →
          </a>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">📖</div>
          <p className="mt-3 font-medium text-gray-600">Il te faut des recettes d&apos;abord !</p>
          <a href="/recettes/nouvelle" className="mt-3 inline-block rounded-full bg-[#E07A5F] px-5 py-2.5 font-medium text-white hover:bg-[#c96a51]">
            Créer une recette
          </a>
        </div>
      ) : (
        <GrillePlan
          dates={dates.map((d) => d.toISOString())}
          slots={[...SLOTS]}
          slotLabels={SLOT_LABELS}
          entries={entries.map((e) => ({
            id: e.id,
            date: e.date.toISOString(),
            slot: e.slot,
            servings: e.servings,
            recipeId: e.recipeId,
            title: e.recipe.title,
          }))}
          recipes={recipes}
        />
      )}
    </main>
  );
}

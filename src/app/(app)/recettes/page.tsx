import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import RecetteCard from "@/components/recettes/recette-card";

export default async function RecettesPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const recipes = await db.recipe.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#4A6741]">Mes recettes</h1>
          <p className="text-sm text-gray-500">{recipes.length} recette(s) dans ta cuisine.</p>
        </div>
        <Link
          href="/recettes/nouvelle"
          className="rounded-full bg-[#E07A5F] px-5 py-2.5 font-medium text-white transition hover:bg-[#c96a51]"
        >
          + Nouvelle recette
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
          <div className="text-4xl">🍳</div>
          <p className="mt-3 font-medium text-gray-600">Ta cuisine est vide !</p>
          <p className="mt-1 text-sm text-gray-400">Ajoute ta première recette pour commencer à planifier.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <RecetteCard
              key={r.id}
              recette={{ id: r.id, title: r.title, servings: r.servings, minutes: r.minutes, tags: r.tags }}
            />
          ))}
        </div>
      )}
    </main>
  );
}

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import RecettesClient from "@/components/recettes/recettes-client";

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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-miamz-vert">Mes recettes</h1>
          <p className="text-sm text-texte-doux">{recipes.length} recette(s) dans ta cuisine.</p>
        </div>
        <Link href="/recettes/nouvelle" className="bouton">
          + Nouvelle recette
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div className="carte p-10 text-center">
          <div className="text-4xl">🍳</div>
          <p className="mt-3 font-medium text-texte-doux">Ta cuisine est vide !</p>
          <p className="mt-1 text-sm text-texte-tres-doux">Ajoute ta première recette pour commencer à planifier.</p>
        </div>
      ) : (
        <RecettesClient
          recettes={recipes.map((r) => ({
            id: r.id,
            title: r.title,
            servings: r.servings,
            minutes: r.minutes,
            tags: r.tags,
            ingredients: r.ingredients,
            steps: r.steps,
          }))}
        />
      )}
    </main>
  );
}

import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import RecettesClient from "@/components/recettes/recettes-client";
import PhotoFrigo from "@/components/recettes/photo-frigo";

export default async function RecettesPage({
  searchParams,
}: {
  searchParams: Promise<{ recette?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const { recette } = await searchParams;

  const [recipes, categories] = await Promise.all([
    db.recipe.findMany({
      where: { createdById: userId },
      include: { categorie: { select: { nom: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.categorie.findMany({
      where: { masquee: false },
      select: { id: true, nom: true },
    }),
  ]);
  categories.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

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
        <>
          <div className="mb-4">
            <PhotoFrigo
              recettes={recipes.map((r) => ({
                id: r.id,
                title: r.title,
                servings: r.servings,
                minutes: r.minutes,
                tags: r.tags,
                ingredients: r.ingredients,
                steps: r.steps,
                categorieId: r.categorieId,
                categorieNom: r.categorie?.nom ?? null,
                isPublic: r.isPublic,
                validatedAt: r.validatedAt,
                validationCount: r.validationCount,
                isSharedCopy: r.isSharedCopy,
                createdById: r.createdById,
                validators: r.validators,
              }))}
              onBrouillon={(r) => {
                // Store in sessionStorage and navigate to new recipe form
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("brouillonPhotoFrigo", JSON.stringify(r));
                  window.location.href = "/recettes/nouvelle";
                }
              }}
            />
          </div>
          <RecettesClient
            categories={categories}
            recetteInitialeId={recette ?? null}
            recettes={recipes.map((r) => ({
              id: r.id,
              title: r.title,
              servings: r.servings,
              minutes: r.minutes,
              tags: r.tags,
              ingredients: r.ingredients,
              steps: r.steps,
              categorieId: r.categorieId,
              categorieNom: r.categorie?.nom ?? null,
              isPublic: r.isPublic,
              validatedAt: r.validatedAt,
              validationCount: r.validationCount,
              isSharedCopy: r.isSharedCopy,
              createdById: r.createdById,
              validators: r.validators,
            }))}
          />
        </>
      )}
    </main>
  );
}

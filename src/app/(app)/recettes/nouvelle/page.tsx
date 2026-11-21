import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import FormulaireRecette from "@/components/recettes/formulaire-recette";

export default async function NouvelleRecettePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const categories = await db.categorie.findMany({
    where: { masquee: false },
    select: { id: true, nom: true },
  });
  categories.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return <FormulaireRecette categories={categories} />;
}

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import FormulaireRecette from "@/components/recettes/formulaire-recette";

export default async function NouvelleRecettePage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const [categories, profil] = await Promise.all([
    db.categorie.findMany({
      where: { masquee: false },
      select: { id: true, nom: true },
    }),
    db.user.findUnique({ where: { id: userId }, select: { householdSize: true } }),
  ]);
  categories.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return <FormulaireRecette categories={categories} portionsDefaut={profil?.householdSize ?? 1} />;
}

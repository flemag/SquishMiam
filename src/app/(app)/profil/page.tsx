import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import ProfilClient from "@/components/profil/profil-client";
import { normaliserTailleFoyer, objectifDepuisValeur } from "@/lib/profil";

export default async function ProfilPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, householdSize: true, goal: true, tokens: true, xp: true, purchasedItems: true, activeTheme: true, activeAccessory: true },
  });
  if (!user) redirect("/connexion");

  const articlesAchetes = user.purchasedItems.length > 0
    ? await db.boutiqueItem.findMany({ where: { id: { in: user.purchasedItems } } })
    : [];

  return (
    <main>
      <ProfilClient
        householdSize={normaliserTailleFoyer(user.householdSize)}
        goal={objectifDepuisValeur(user.goal)}
        tokens={user.tokens}
        email={user.email}
        xp={user.xp}
        articlesAchetes={articlesAchetes.map((a) => ({ id: a.id, type: a.type, nom: a.nom, metadata: a.metadata }))}
        activeTheme={user.activeTheme}
        activeAccessory={user.activeAccessory}
      />
    </main>
  );
}

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { weekStart } from "@/lib/plan";
import NavBar from "@/components/nav-bar";
import { FournisseurMiamz } from "@/components/miamz/fournisseur";
import Compagnon from "@/components/miamz/compagnon";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  // Compte initial de repas planifiés cette semaine (lundi UTC → lundi UTC).
  const debut = weekStart(new Date());
  const fin = new Date(debut);
  fin.setUTCDate(fin.getUTCDate() + 7);
  const repasSemaine = userId
    ? await db.mealPlanEntry.count({ where: { ownerId: userId, date: { gte: debut, lt: fin } } })
    : 0;

  return (
    <div className="min-h-screen bg-[#FFF9E6]">
      <NavBar />
      <FournisseurMiamz repasSemaine={repasSemaine}>
        <div className="mx-auto max-w-5xl px-4 pb-24 py-6 sm:pb-6">{children}</div>
        <Compagnon />
      </FournisseurMiamz>
    </div>
  );
}

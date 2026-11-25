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

  const utilisateur = userId
    ? await db.user.findUnique({ where: { id: userId }, select: { role: true, activeAccessory: true, activeTheme: true } })
    : null;

  // Charger l'accessoire actif (emoji + position)
  let accessoireEmoji: string | null = null;
  let accessoirePosition: string | null = null;
  if (utilisateur?.activeAccessory) {
    const item = await db.boutiqueItem.findUnique({
      where: { id: utilisateur.activeAccessory },
      select: { metadata: true },
    });
    if (item) {
      const meta = item.metadata as Record<string, unknown>;
      accessoireEmoji = typeof meta.emoji === "string" ? meta.emoji : null;
      accessoirePosition = typeof meta.position === "string" ? meta.position : null;
    }
  }

  // Charger le thème actif (couleurs)
  let themeCouleurs: Record<string, string> | null = null;
  if (utilisateur?.activeTheme) {
    const item = await db.boutiqueItem.findUnique({
      where: { id: utilisateur.activeTheme },
      select: { metadata: true },
    });
    if (item) {
      const meta = item.metadata as Record<string, unknown>;
      if (meta && typeof meta.primary === "string") {
        themeCouleurs = meta as Record<string, string>;
      }
    }
  }

  return (
    <div className="min-h-screen" style={themeCouleurs ? {
      "--color-primary": themeCouleurs.primary,
      "--color-secondary": themeCouleurs.secondary,
      "--color-accent": themeCouleurs.accent,
      "--color-background": themeCouleurs.background,
      "--color-text": themeCouleurs.text,
    } as React.CSSProperties : undefined}>
      <NavBar estAdmin={utilisateur?.role === "ADMIN"} />
      <FournisseurMiamz repasSemaine={repasSemaine}>
        <div className="mx-auto max-w-5xl px-4 pb-24 py-6 sm:pb-6">{children}</div>
        <Compagnon accessoireEmoji={accessoireEmoji} accessoirePosition={accessoirePosition} />
      </FournisseurMiamz>
    </div>
  );
}

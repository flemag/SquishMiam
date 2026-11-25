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
    ? await db.user.findUnique({ where: { id: userId }, select: { role: true, activeAccessory: true, activeTheme: true, purchasedItems: true } })
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

  // Charger le thème actif (couleurs) + thèmes achetés pour le sélecteur
  let themeCouleurs: Record<string, string> | null = null;
  let themesAchetes: { id: string; nom: string; metadata: unknown }[] = [];
  if (utilisateur?.purchasedItems?.length) {
    const items = await db.boutiqueItem.findMany({
      where: { id: { in: utilisateur.purchasedItems }, type: "theme", actif: true },
      select: { id: true, nom: true, metadata: true },
    });
    themesAchetes = items;
  }
  if (utilisateur?.activeTheme) {
    const item = themesAchetes.find((t) => t.id === utilisateur.activeTheme)
      ?? await db.boutiqueItem.findUnique({ where: { id: utilisateur.activeTheme }, select: { id: true, nom: true, metadata: true } });
    if (item) {
      const meta = item.metadata as Record<string, unknown>;
      if (meta && typeof meta.primary === "string") {
        themeCouleurs = meta as Record<string, string>;
      }
    }
  }

  // Générer les overrides CSS pour le thème boutique actif
  const themeCss = themeCouleurs ? `
    :root {
      --theme-primary: ${themeCouleurs.primary};
      --theme-secondary: ${themeCouleurs.secondary};
      --theme-accent: ${themeCouleurs.accent};
      --theme-background: ${themeCouleurs.background};
      --theme-text: ${themeCouleurs.text};
    }
    body { background-color: ${themeCouleurs.background} !important; color: ${themeCouleurs.text} !important; }
    .text-\\[\\#4A6741\\] { color: ${themeCouleurs.primary} !important; }
    .bg-\\[\\#4A6741\\] { background-color: ${themeCouleurs.primary} !important; }
    .border-\\[\\#4A6741\\] { border-color: ${themeCouleurs.primary} !important; }
    .text-\\[\\#A8E6CF\\] { color: ${themeCouleurs.secondary} !important; }
    .bg-\\[\\#A8E6CF\\] { background-color: ${themeCouleurs.secondary} !important; }
    .border-\\[\\#A8E6CF\\] { border-color: ${themeCouleurs.secondary} !important; }
    .text-\\[\\#3A2E2E\\] { color: ${themeCouleurs.text} !important; }
    .bg-\\[\\#FFF9E6\\] { background-color: ${themeCouleurs.background} !important; }
    .text-\\[\\#E07A5F\\] { color: ${themeCouleurs.accent} !important; }
    .bg-\\[\\#E07A5F\\] { background-color: ${themeCouleurs.accent} !important; }
    .border-\\[\\#E07A5F\\] { border-color: ${themeCouleurs.accent} !important; }
    .hover\\:bg-\\[\\#A8E6CF\\]\\/30:hover { background-color: ${themeCouleurs.secondary}4d !important; }
    .bg-\\[\\#A8E6CF\\]\\/10 { background-color: ${themeCouleurs.secondary}1a !important; }
    .bg-\\[\\#A8E6CF\\]\\/15 { background-color: ${themeCouleurs.secondary}26 !important; }
    .bg-\\[\\#A8E6CF\\]\\/20 { background-color: ${themeCouleurs.secondary}33 !important; }
    .bg-\\[\\#A8E6CF\\]\\/25 { background-color: ${themeCouleurs.secondary}40 !important; }
    .bg-\\[\\#A8E6CF\\]\\/30 { background-color: ${themeCouleurs.secondary}4d !important; }
    .bg-\\[\\#A8E6CF\\]\\/40 { background-color: ${themeCouleurs.secondary}66 !important; }
    .bg-\\[\\#A8E6CF\\]\\/50 { background-color: ${themeCouleurs.secondary}80 !important; }
    .bg-\\[\\#FFB5C2\\]\\/25 { background-color: ${themeCouleurs.accent}40 !important; }
    .bg-\\[\\#FFB5C2\\]\\/20 { background-color: ${themeCouleurs.accent}33 !important; }
    .text-\\[\\#8c2f3f\\] { color: ${themeCouleurs.accent} !important; }
    .text-\\[\\#2e5340\\] { color: ${themeCouleurs.primary} !important; }
    .text-\\[\\#43325e\\] { color: ${themeCouleurs.primary} !important; }
    .bg-\\[\\#C9B6E4\\]\\/20 { background-color: ${themeCouleurs.secondary}33 !important; }
    .text-\\[\\#8fb5a2\\] { color: ${themeCouleurs.secondary} !important; }
    .text-\\[\\#e0e0e0\\] { color: ${themeCouleurs.text} !important; }
  ` : "";

  return (
    <>
      {themeCouleurs && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      <div className="min-h-screen">
        <NavBar estAdmin={utilisateur?.role === "ADMIN"} themesAchetes={themesAchetes} />
        <FournisseurMiamz repasSemaine={repasSemaine}>
          <div className="mx-auto max-w-5xl px-4 pb-24 py-6 sm:pb-6">{children}</div>
          <Compagnon accessoireEmoji={accessoireEmoji} accessoirePosition={accessoirePosition} />
        </FournisseurMiamz>
      </div>
    </>
  );
}

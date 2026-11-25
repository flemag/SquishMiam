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
  let themeActif: { id: string; metadata: Record<string, unknown> } | null = null;
  let themesAchetes: { id: string; nom: string; metadata: Record<string, unknown> }[] = [];
  if (utilisateur?.purchasedItems?.length) {
    const items = await db.boutiqueItem.findMany({
      where: { id: { in: utilisateur.purchasedItems }, type: "theme", actif: true },
      select: { id: true, nom: true, metadata: true },
    });
    themesAchetes = items as { id: string; nom: string; metadata: Record<string, unknown> }[];
  }
  if (utilisateur?.activeTheme) {
    const item = themesAchetes.find((t) => t.id === utilisateur.activeTheme)
      ?? await db.boutiqueItem.findUnique({ where: { id: utilisateur.activeTheme }, select: { id: true, nom: true, metadata: true } });
    if (item) {
      const meta = item.metadata as Record<string, unknown>;
      if (meta && typeof meta.primary === "string") {
        themeActif = { id: item.id, metadata: meta as Record<string, unknown> };
      }
    }
  }

  // Générer les overrides CSS pour le thème boutique actif
  const themeCss = themeActif ? `
    :root {
      --color-primary: ${themeActif.metadata.primary};
      --color-primary-hover: ${themeActif.metadata.primaryHover ?? themeActif.metadata.primary};
      --color-primary-light: ${themeActif.metadata.primaryLight ?? themeActif.metadata.primary};
      --color-secondary: ${themeActif.metadata.secondary};
      --color-secondary-hover: ${themeActif.metadata.secondaryHover ?? themeActif.metadata.secondary};
      --color-accent: ${themeActif.metadata.accent};
      --color-accent-hover: ${themeActif.metadata.accentHover ?? themeActif.metadata.accent};
      --color-background: ${themeActif.metadata.background};
      --color-surface: ${themeActif.metadata.surface ?? "#ffffff"};
      --color-surface-elevated: ${themeActif.metadata.surfaceElevated ?? themeActif.metadata.background};
      --color-foreground: ${themeActif.metadata.foreground ?? "#3a2e2e"};
      --color-foreground-muted: ${themeActif.metadata.foregroundMuted ?? "rgba(58,46,46,0.64)"};
      --color-foreground-subtle: ${themeActif.metadata.foregroundSubtle ?? "rgba(58,46,46,0.45)"};
      --color-border: ${themeActif.metadata.border ?? "rgba(58,46,46,0.12)"};
      --color-danger: ${themeActif.metadata.danger ?? "#b0413e"};
      --color-danger-hover: ${themeActif.metadata.dangerHover ?? "#9a3533"};
    }
    html[data-boutique-theme] body { background-color: ${themeActif.metadata.background} !important; color: ${themeActif.metadata.foreground ?? "#3a2e2e"} !important; }
    html[data-boutique-theme] .text-\\[\\#4A6741\\] { color: ${themeActif.metadata.primary} !important; }
    html[data-boutique-theme] .bg-\\[\\#4A6741\\] { background-color: ${themeActif.metadata.primary} !important; }
    html[data-boutique-theme] .border-\\[\\#4A6741\\] { border-color: ${themeActif.metadata.primary} !important; }
    html[data-boutique-theme] .text-\\[\\#A8E6CF\\] { color: ${themeActif.metadata.secondary} !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\] { background-color: ${themeActif.metadata.secondary} !important; }
    html[data-boutique-theme] .border-\\[\\#A8E6CF\\] { border-color: ${themeActif.metadata.secondary} !important; }
    html[data-boutique-theme] .text-\\[\\#3A2E2E\\] { color: ${themeActif.metadata.foreground ?? "#3a2e2e"} !important; }
    html[data-boutique-theme] .bg-\\[\\#FFF9E6\\] { background-color: ${themeActif.metadata.background} !important; }
    html[data-boutique-theme] .text-\\[\\#E07A5F\\] { color: ${themeActif.metadata.accent} !important; }
    html[data-boutique-theme] .bg-\\[\\#E07A5F\\] { background-color: ${themeActif.metadata.accent} !important; }
    html[data-boutique-theme] .border-\\[\\#E07A5F\\] { border-color: ${themeActif.metadata.accent} !important; }
    html[data-boutique-theme] .hover\\:bg-\\[\\#A8E6CF\\]\\/30:hover { background-color: ${themeActif.metadata.secondary}4d !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\]\\/10 { background-color: ${themeActif.metadata.secondary}1a !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\]\\/15 { background-color: ${themeActif.metadata.secondary}26 !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\]\\/20 { background-color: ${themeActif.metadata.secondary}33 !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\]\\/25 { background-color: ${themeActif.metadata.secondary}40 !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\]\\/30 { background-color: ${themeActif.metadata.secondary}4d !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\]\\/40 { background-color: ${themeActif.metadata.secondary}66 !important; }
    html[data-boutique-theme] .bg-\\[\\#A8E6CF\\]\\/50 { background-color: ${themeActif.metadata.secondary}80 !important; }
    html[data-boutique-theme] .bg-\\[\\#FFB5C2\\]\\/25 { background-color: ${themeActif.metadata.accent}40 !important; }
    html[data-boutique-theme] .bg-\\[\\#FFB5C2\\]\\/20 { background-color: ${themeActif.metadata.accent}33 !important; }
    html[data-boutique-theme] .text-\\[\\#8c2f3f\\] { color: ${themeActif.metadata.accent} !important; }
    html[data-boutique-theme] .text-\\[\\#2e5340\\] { color: ${themeActif.metadata.primary} !important; }
    html[data-boutique-theme] .text-\\[\\#43325e\\] { color: ${themeActif.metadata.primary} !important; }
    html[data-boutique-theme] .bg-\\[\\#C9B6E4\\]\\/20 { background-color: ${themeActif.metadata.secondary}33 !important; }
    html[data-boutique-theme] .text-\\[\\#8fb5a2\\] { color: ${themeActif.metadata.secondary} !important; }
    html[data-boutique-theme] .text-\\[\\#e0e0e0\\] { color: ${themeActif.metadata.foreground ?? "#3a2e2e"} !important; }
  ` : "";

  return (
    <>
      {themeActif && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}
      <html data-boutique-theme={themeActif?.id ?? ""} lang="fr">
        <head />
        <body className="min-h-screen">
          <NavBar estAdmin={utilisateur?.role === "ADMIN"} themesAchetes={themesAchetes} />
          <FournisseurMiamz repasSemaine={repasSemaine}>
            <div className="mx-auto max-w-5xl px-4 pb-24 py-6 sm:pb-6">{children}</div>
            <Compagnon accessoireEmoji={accessoireEmoji} accessoirePosition={accessoirePosition} />
          </FournisseurMiamz>
        </body>
      </html>
    </>
  );
}
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import MiamzStatuette from "@/components/miamz-statuette";
import { THEMES, THEME_DEFAUT, themeDepuisValeur, type ThemeId } from "@/lib/themes";

const LIENS = [
  { href: "/plan", label: "Plan", Icone: Icalendrier },
  { href: "/recettes", label: "Recettes", Icone: Ilivre },
  { href: "/boutique", label: "Boutique", Icone: Iboutique },
  { href: "/courses", label: "Courses", Icone: Ipanier },
  { href: "/profil", label: "Profil", Icone: Iprofil },
];

/* Icônes SVG inline (tracés type Lucide, MIT) — zéro dépendance. */
function Icalendrier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </svg>
  );
}

function Ilivre({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function Ipanier({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function Iboutique({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 9 4.5 4h15L21 9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
      <path d="M5 12v8h14v-8" />
      <path d="M9 20v-5h6v5" />
    </svg>
  );
}

function Iprofil({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}

function Ideconnexion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

function Ibouclier({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function Ipalette({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="13.5" cy="6.5" r="0.5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r="0.5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r="0.5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r="0.5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.648-1.687h2.226c3.2 0 5.853-2.58 5.853-5.75C22 6.5 17.5 2 12 2z" />
    </svg>
  );
}

/** Valeur du cookie miamz-theme (regex simple ; themeDepuisValeur garde le reste). */
function litCookieTheme(): string | null {
  const m = /(?:^|;\s*)miamz-theme=([^;]*)/.exec(document.cookie);
  return m ? m[1] : null;
}

/**
 * Sélecteur de thème : bouton palette (44 px) → popover .carte listant les
 * 3 thèmes. Au choix : cookie persistant (relui par le layout racine au
 * prochain rendu serveur) + data-theme immédiat (changement instantané,
 * sans rechargement), puis fermeture. Déclose au clic sur le fond.
 */
function SelecteurTheme({ themesAchetes = [] }: { themesAchetes?: { id: string; nom: string; metadata: unknown }[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [theme, setTheme] = useState<string>(THEME_DEFAUT);

  // Lu une fois au montage : le serveur a déjà posé data-theme sur <html> ;
  // ici on aligne seulement la coche du popover (zéro décalage d'hydratation).
  useEffect(() => {
    const cookie = litCookieTheme();
    setTheme(cookie || THEME_DEFAUT);
  }, []);

  function choisirBoutique(id: string, meta: Record<string, unknown>) {
    document.cookie = `miamz-theme=${id}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.dataset.boutiqueTheme = id;
    document.documentElement.dataset.theme = "boutique";

    // Inject CSS overrides for the boutique theme (without html[data-boutique-theme] prefix for reliability)
    const existingStyle = document.getElementById("boutique-theme-override");
    if (existingStyle) existingStyle.remove();

    const primary = (meta.primary as string) ?? "#4a6741";
    const secondary = (meta.secondary as string) ?? "#a8e6cf";
    const accent = (meta.accent as string) ?? "#e07a5f";
    const background = (meta.background as string) ?? "#fff3d6";
    const foreground = (meta.foreground as string) ?? "#3a2e2e";

    const css = `
      body { background-color: ${background} !important; color: ${foreground} !important; }
      .text-\\[\\#4A6741\\] { color: ${primary} !important; }
      .bg-\\[\\#4A6741\\] { background-color: ${primary} !important; }
      .border-\\[\\#4A6741\\] { border-color: ${primary} !important; }
      .text-\\[\\#A8E6CF\\] { color: ${secondary} !important; }
      .bg-\\[\\#A8E6CF\\] { background-color: ${secondary} !important; }
      .border-\\[\\#A8E6CF\\] { border-color: ${secondary} !important; }
      .text-\\[\\#3A2E2E\\] { color: ${foreground} !important; }
      .bg-\\[\\#FFF9E6\\] { background-color: ${background} !important; }
      .text-\\[\\#E07A5F\\] { color: ${accent} !important; }
      .bg-\\[\\#E07A5F\\] { background-color: ${accent} !important; }
      .border-\\[\\#E07A5F\\] { border-color: ${accent} !important; }
      .hover\\:bg-\\[\\#A8E6CF\\]\\/30:hover { background-color: ${secondary}4d !important; }
      .bg-\\[\\#A8E6CF\\]\\/10 { background-color: ${secondary}1a !important; }
      .bg-\\[\\#A8E6CF\\]\\/15 { background-color: ${secondary}26 !important; }
      .bg-\\[\\#A8E6CF\\]\\/20 { background-color: ${secondary}33 !important; }
      .bg-\\[\\#A8E6CF\\]\\/25 { background-color: ${secondary}40 !important; }
      .bg-\\[\\#A8E6CF\\]\\/30 { background-color: ${secondary}4d !important; }
      .bg-\\[\\#A8E6CF\\]\\/40 { background-color: ${secondary}66 !important; }
      .bg-\\[\\#A8E6CF\\]\\/50 { background-color: ${secondary}80 !important; }
      .bg-\\[\\#FFB5C2\\]\\/25 { background-color: ${accent}40 !important; }
      .bg-\\[\\#FFB5C2\\]\\/20 { background-color: ${accent}33 !important; }
      .text-\\[\\#8c2f3f\\] { color: ${accent} !important; }
      .text-\\[\\#2e5340\\] { color: ${primary} !important; }
      .text-\\[\\#43325e\\] { color: ${primary} !important; }
      .bg-\\[\\#C9B6E4\\]\\/20 { background-color: ${secondary}33 !important; }
      .text-\\[\\#8fb5a2\\] { color: ${secondary} !important; }
      .text-\\[\\#e0e0e0\\] { color: ${foreground} !important; }
    `;

    const styleEl = document.createElement("style");
    styleEl.id = "boutique-theme-override";
    styleEl.textContent = css;
    document.head.appendChild(styleEl);

    setTheme(id);
    setOuvert(false);
  }

  function choisirBuiltin(id: ThemeId) {
    document.cookie = `miamz-theme=${id}; path=/; max-age=31536000; samesite=lax`;
    // Remove boutique theme override
    const existingStyle = document.getElementById("boutique-theme-override");
    if (existingStyle) existingStyle.remove();
    document.documentElement.removeAttribute("data-boutique-theme");
    document.documentElement.dataset.theme = id;
    setTheme(id);
    setOuvert(false);
  }

  return (
    <>
      {ouvert && (
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Fermer le choix de thème"
          tabIndex={-1}
          className="fixed inset-0 z-10 cursor-default"
        />
      )}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-label="Choisir un thème"
        aria-expanded={ouvert}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-texte-doux transition hover:bg-[#A8E6CF]/30"
      >
        <Ipalette className="h-5 w-5" />
      </button>
      {ouvert && (
        <div className="carte absolute right-4 top-[calc(100%+0.5rem)] z-20 w-64 p-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => choisirBuiltin(t.id)}
              aria-current={theme === t.id ? "true" : undefined}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground transition ${
                theme === t.id ? "bg-[#A8E6CF]/30" : "hover:bg-[#A8E6CF]/20"
              }`}
            >
              <span className="flex shrink-0 items-center gap-1">
                <span className="h-4 w-4 rounded-full border border-bordure" style={{ background: t.apercu.fond }} />
                <span className="h-4 w-4 rounded-full border border-bordure" style={{ background: t.apercu.accent }} />
                <span className="h-4 w-4 rounded-full border border-bordure" style={{ background: t.apercu.trait }} />
              </span>
              {t.label}
            </button>
          ))}
          {themesAchetes.length > 0 && (
            <>
              <div className="my-1 border-t border-bordure" />
              {themesAchetes.map((t) => {
                const meta = t.metadata as Record<string, unknown>;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => choisirBoutique(t.id, meta)}
                    aria-current={theme === t.id ? "true" : undefined}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-foreground transition ${
                      theme === t.id ? "bg-[#A8E6CF]/30" : "hover:bg-[#A8E6CF]/20"
                    }`}
                  >
                    <span className="flex shrink-0 items-center gap-1">
                      <span className="h-4 w-4 rounded-full border border-bordure" style={{ background: (meta.primary as string) ?? "#ccc" }} />
                      <span className="h-4 w-4 rounded-full border border-bordure" style={{ background: (meta.accent as string) ?? "#ccc" }} />
                      <span className="h-4 w-4 rounded-full border border-bordure" style={{ background: (meta.secondary as string) ?? "#ccc" }} />
                    </span>
                    {t.nom}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </>
  );
}

export default function NavBar({ estAdmin, themesAchetes = [] }: { estAdmin: boolean; themesAchetes?: { id: string; nom: string; metadata: unknown }[] }) {
  const pathname = usePathname();

  return (
    <>
      {/* Barre haute : logo à gauche, liens (desktop) et déconnexion à droite.
          Sur mobile, seuls le logo, le sélecteur de thème et la déconnexion —
          zéro débordement. */}
      <header className="sticky top-0 z-30 border-b border-bordure bg-fond-voile backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link href="/plan" className="flex items-center gap-2 text-lg font-semibold text-[#4A6741]">
            <MiamzStatuette size={34} /> Miamz
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LIENS.map((lien) => {
              const actif = pathname.startsWith(lien.href);
              return (
                <Link
                  key={lien.href}
                  href={lien.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    actif ? "bg-[#4A6741] text-white" : "text-texte-doux hover:bg-[#A8E6CF]/30"
                  }`}
                >
                  {lien.label}
                </Link>
              );
            })}
            {estAdmin && (
              <Link
                href="/admin"
                aria-label="Panneau admin"
                className="flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-medium text-[#4A6741] transition hover:bg-[#A8E6CF]/30"
              >
                <Ibouclier className="h-4 w-4" /> Admin
              </Link>
            )}
            <SelecteurTheme themesAchetes={themesAchetes} />
            <button
              onClick={() => signOut({ callbackUrl: "/connexion" })}
              className="ml-2 rounded-full px-3 py-2 text-sm text-texte-tres-doux transition hover:bg-[#FFB5C2]/25 hover:text-danger"
              title="Se déconnecter"
            >
              Déconnexion
            </button>
          </nav>
          <div className="flex items-center gap-1 sm:hidden">
            {estAdmin && (
              <Link
                href="/admin"
                aria-label="Panneau admin"
                title="Panneau admin"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#4A6741] transition hover:bg-[#A8E6CF]/30"
              >
                <Ibouclier className="h-5 w-5" />
              </Link>
            )}
            <SelecteurTheme themesAchetes={themesAchetes} />
            <button
              onClick={() => signOut({ callbackUrl: "/connexion" })}
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-texte-tres-doux transition hover:bg-[#FFB5C2]/25 hover:text-danger"
            >
              <Ideconnexion className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Barre d'onglets mobile (Android/iOS) : fixe, safe-area, cibles ≥ 44 px. */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-bordure bg-fond-voile pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-5">
          {LIENS.map((lien) => {
            const actif = pathname.startsWith(lien.href);
            return (
              <Link
                key={lien.href}
                href={lien.href}
                aria-current={actif ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-medium transition ${
                  actif ? "text-[#4A6741]" : "text-texte-doux"
                }`}
              >
                <lien.Icone className="h-6 w-6" />
                <span className={actif ? "font-semibold" : undefined}>{lien.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

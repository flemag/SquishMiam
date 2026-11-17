"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import MiamzStatuette from "@/components/miamz-statuette";

const LIENS = [
  { href: "/plan", label: "Plan", Icone: Icalendrier },
  { href: "/recettes", label: "Recettes", Icone: Ilivre },
  { href: "/courses", label: "Courses", Icone: Ipanier },
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

function Ideconnexion({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export default function NavBar() {
  const pathname = usePathname();

  return (
    <>
      {/* Barre haute : logo à gauche, liens (desktop) et déconnexion à droite.
          Sur mobile, seuls le logo et l'icône de déconnexion — zéro débordement. */}
      <header className="sticky top-0 z-10 border-b border-bordure bg-fond-voile backdrop-blur">
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
            <button
              onClick={() => signOut({ callbackUrl: "/connexion" })}
              className="ml-2 rounded-full px-3 py-2 text-sm text-texte-tres-doux transition hover:bg-[#FFB5C2]/25 hover:text-danger"
              title="Se déconnecter"
            >
              Déconnexion
            </button>
          </nav>
          <button
            onClick={() => signOut({ callbackUrl: "/connexion" })}
            aria-label="Se déconnecter"
            title="Se déconnecter"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-texte-tres-doux transition hover:bg-[#FFB5C2]/25 hover:text-danger sm:hidden"
          >
            <Ideconnexion className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Barre d'onglets mobile (Android/iOS) : fixe, safe-area, cibles ≥ 44 px. */}
      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-bordure bg-fond-voile pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto grid max-w-5xl grid-cols-3">
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

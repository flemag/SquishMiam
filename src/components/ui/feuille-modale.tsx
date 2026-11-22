"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Coquille modale universelle des bottom sheets (design doc 2c) : panneau bas
 * de page, fermeture Esc + clic arrière-plan, focus posé sur le panneau,
 * scroll interne + safe-area. Zéro dépendance.
 */
export default function FeuilleModale({
  ouvert,
  onFermer,
  titre,
  children,
  footer,
}: {
  ouvert: boolean;
  onFermer: () => void;
  titre: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const panneauRef = useRef<HTMLDivElement>(null);
  const fermerRef = useRef(onFermer);

  useEffect(() => {
    fermerRef.current = onFermer;
  }, [onFermer]);

  useEffect(() => {
    if (!ouvert) return;
    const precedent = document.activeElement as HTMLElement | null;
    const panneau = panneauRef.current;
    panneau?.focus();

    const ecoute = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        fermerRef.current();
        return;
      }
      if (e.key !== "Tab" || !panneau) return;

      // Piège de focus : la tabulation reste dans la feuille tant qu'elle est ouverte.
      const focusables = Array.from(
        panneau.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusables.length === 0) {
        e.preventDefault();
        panneau.focus();
        return;
      }
      const premier = focusables[0];
      const dernier = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === premier || document.activeElement === panneau)) {
        e.preventDefault();
        dernier.focus();
      } else if (!e.shiftKey && document.activeElement === dernier) {
        e.preventDefault();
        premier.focus();
      }
    };

    window.addEventListener("keydown", ecoute);
    return () => {
      window.removeEventListener("keydown", ecoute);
      precedent?.focus?.();
    };
  }, [ouvert]);

  if (!ouvert) return null;

  return (
    <>
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        tabIndex={-1}
        className="fixed inset-0 z-40 cursor-default bg-black/30"
      />
      <div
        ref={panneauRef}
        role="dialog"
        aria-modal="true"
        aria-label={titre}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg outline-none"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200" />
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute right-4 top-3 flex h-11 w-11 items-center justify-center rounded-full text-lg text-texte-doux transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-[#e07a5f]"
        >
          ✕
        </button>
        <h2 className="pr-12 text-lg font-semibold text-miamz-vert">{titre}</h2>
        {children}
        {footer && <div className="mt-5 flex gap-3">{footer}</div>}
      </div>
    </>
  );
}

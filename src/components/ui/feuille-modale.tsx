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

  useEffect(() => {
    if (!ouvert) return;
    const ecoute = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", ecoute);
    panneauRef.current?.focus();
    return () => window.removeEventListener("keydown", ecoute);
  }, [ouvert, onFermer]);

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
        <h2 className="text-lg font-semibold text-miamz-vert">{titre}</h2>
        {children}
        {footer && <div className="mt-5 flex gap-3">{footer}</div>}
      </div>
    </>
  );
}

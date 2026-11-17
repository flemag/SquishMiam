"use client";

import { useContext, useMemo, useReducer, type ReactNode } from "react";
import type { EvenementMiamz } from "@/lib/moteur-humeur";
import { MiamzContext, type EtatMiamz, type ValeurMiamz } from "./contexte";
import { prochainEtat } from "./fournisseur-etat";

/**
 * Provider du compagnon : porte le compte de repas de la semaine (calculé
 * côté serveur dans le layout) et l'émetteur d'événements. Monté une fois
 * dans (app)/layout.tsx, avec <Compagnon /> à l'intérieur.
 */
export function FournisseurMiamz({
  repasSemaine,
  children,
}: {
  repasSemaine: number;
  children: ReactNode;
}) {
  const [etat, emettre] = useReducer(
    // useReducer ne passe que (état, action) : l'horloge est prise au dispatch.
    (etat: EtatMiamz, evenement: EvenementMiamz) =>
      prochainEtat(etat, evenement, new Date()),
    {
      repasSemaine,
      dernierEvenement: null,
      dernierEvenementHorodatage: null,
      semaineCompleteEmise: false,
    } satisfies EtatMiamz
  );

  const valeur = useMemo<ValeurMiamz>(() => ({ ...etat, emettre }), [etat]);

  return <MiamzContext.Provider value={valeur}>{children}</MiamzContext.Provider>;
}

/** Accès à l'état et à l'émetteur — hors du provider, c'est un bug d'usage. */
export function useMiamz(): ValeurMiamz {
  const valeur = useContext(MiamzContext);
  if (!valeur) throw new Error("useMiamz doit être utilisé sous <FournisseurMiamz>");
  return valeur;
}

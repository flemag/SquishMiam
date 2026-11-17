import { createContext } from "react";
import type { EvenementMiamz } from "@/lib/moteur-humeur";

/**
 * État partagé du compagnon. Le provider (fournisseur.tsx) le remplit ;
 * quand il est absent, le Compagnon retombe sur content sans événements.
 * dernierEvenementHorodatage (Date.now à l'émission) permet de rafraîchir
 * l'âge ilYAms sans casser la pureté de prochainEtat.
 */
export type EtatMiamz = {
  repasSemaine: number;
  dernierEvenement: { type: EvenementMiamz; ilYAms: number } | null;
  dernierEvenementHorodatage: number | null;
  semaineCompleteEmise: boolean;
};

/** Valeur exposée par le provider : l'état + l'émetteur d'événements. */
export type ValeurMiamz = EtatMiamz & {
  emettre: (type: EvenementMiamz) => void;
};

export const MiamzContext = createContext<ValeurMiamz | null>(null);

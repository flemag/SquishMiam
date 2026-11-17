import { createContext } from "react";
import type { EvenementMiamz } from "@/lib/moteur-humeur";

/**
 * État partagé du compagnon. Le provider (fournisseur.tsx, Task 5) le remplit ;
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

export const MiamzContext = createContext<EtatMiamz | null>(null);

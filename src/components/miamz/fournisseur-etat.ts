import type { EvenementMiamz } from "@/lib/moteur-humeur";
import { SLOTS } from "@/lib/plan";
import type { EtatMiamz } from "./contexte";

/** Semaine complète = tous les services des 7 jours planifiés (SLOTS × 7). */
const REPAS_SEMAINE_COMPLETE = SLOTS.length * 7;

/**
 * Réduction pure de l'état du compagnon : le provider (fournisseur.tsx) la
 * branche sur useReducer, c'est tout. "semaine-complete" est un événement
 * interne : émis ici quand une planification porte la semaine à 21 repas,
 * une seule fois par session.
 */
export function prochainEtat(
  etat: EtatMiamz,
  evenement: EvenementMiamz,
  maintenant: Date
): EtatMiamz {
  const horodatage = maintenant.getTime();
  const dernierEvenement = (type: EvenementMiamz) => ({
    dernierEvenement: { type, ilYAms: 0 },
    dernierEvenementHorodatage: horodatage,
  });

  if (evenement === "repas-planifie") {
    const repasSemaine = etat.repasSemaine + 1;
    if (repasSemaine >= REPAS_SEMAINE_COMPLETE && !etat.semaineCompleteEmise) {
      return {
        ...etat,
        repasSemaine,
        ...dernierEvenement("semaine-complete"),
        semaineCompleteEmise: true,
      };
    }
    return { ...etat, repasSemaine, ...dernierEvenement("repas-planifie") };
  }

  if (evenement === "repas-retire") {
    return {
      ...etat,
      repasSemaine: Math.max(0, etat.repasSemaine - 1),
      ...dernierEvenement("repas-retire"),
    };
  }

  if (evenement === "semaine-complete") {
    // Émis en interne uniquement — accepté par robustesse, jamais re-compté.
    return { ...etat, ...dernierEvenement("semaine-complete"), semaineCompleteEmise: true };
  }

  // course-cochee, recette-creee : le compteur ne bouge pas.
  return { ...etat, ...dernierEvenement(evenement) };
}

import type { EvenementMiamz } from "@/lib/moteur-humeur";
import type { EtatMiamz } from "./contexte";

/**
 * Réduction pure de l'état du compagnon : le provider (fournisseur.tsx) la
 * branche sur useReducer, c'est tout. "semaine-complete" est un événement
 * interne : émis ici quand une planification porte la semaine à 14 repas,
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
    if (repasSemaine >= 14 && !etat.semaineCompleteEmise) {
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

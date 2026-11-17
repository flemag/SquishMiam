import type { HumeurId } from "@/lib/humeurs";

/**
 * Événements émis par l'app (Task 5). "semaine-complete" est généré par le
 * fournisseur d'état quand les repas planifiés atteignent 21.
 */
export type EvenementMiamz =
  | "repas-planifie"
  | "repas-retire"
  | "course-cochee"
  | "recette-creee"
  | "semaine-complete";

export type ContexteMiamz = {
  /** Horloge du client (navigateur) — le moteur l'utilise telle quelle. */
  maintenant: Date;
  /** Nombre de repas planifiés cette semaine (0..21). */
  repasSemaine: number;
  /** Dernier événement connu et son âge en ms ; null au repos. */
  dernierEvenement: { type: EvenementMiamz; ilYAms: number } | null;
};

const MINUTE = 60_000;

/**
 * Chaîne de règles priorisées — la première vraie gagne.
 * 1. fete       : semaine complète il y a < 5 min (même la nuit)
 * 2. endormi    : entre 23h00 et 5h59
 * 3. concentre  : planification il y a < 1 min
 * 4. motive     : recette créée il y a < 2 min
 * 5. taquin     : course cochée il y a < 1 min
 * 6. affame     : entre 18h et 21h, semaine vide
 * 7. relax      : entre 21h et 23h, semaine fournie
 * 8. fier       : >= 10 repas planifiés
 * 9. content    : défaut
 * Les humeurs decu/calin/inquiet/surpris/repu n'ont pas encore de déclencheur
 * local : le plan 2b les activera via les intentions du chat IA.
 */
export function evaluerHumeur(ctx: ContexteMiamz): HumeurId {
  const ev = ctx.dernierEvenement;
  if (ev?.type === "semaine-complete" && ev.ilYAms < 5 * MINUTE) return "fete";

  const h = ctx.maintenant.getHours();
  if (h >= 23 || h < 6) return "endormi";

  if (ev) {
    if (ev.type === "repas-planifie" && ev.ilYAms < MINUTE) return "concentre";
    if (ev.type === "recette-creee" && ev.ilYAms < 2 * MINUTE) return "motive";
    if (ev.type === "course-cochee" && ev.ilYAms < MINUTE) return "taquin";
  }

  if (h >= 18 && h < 21 && ctx.repasSemaine === 0) return "affame";
  if (h >= 21 && h < 23 && ctx.repasSemaine > 0) return "relax";
  if (ctx.repasSemaine >= 10) return "fier";
  return "content";
}

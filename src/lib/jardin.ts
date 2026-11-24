export type ActionXp = "repas_planifie" | "course_cochee" | "recette_ajoutee" | "recette_validee" | "semaine_complete";

export type Niveau = { niveau: number; xpRequis: number; plante: string; emoji: string };

export const NIVEAUX: Niveau[] = [
  { niveau: 1, xpRequis: 0, plante: "Graine", emoji: "🌱" },
  { niveau: 2, xpRequis: 50, plante: "Pousse", emoji: "🌿" },
  { niveau: 3, xpRequis: 150, plante: "Fleur", emoji: "🌸" },
  { niveau: 4, xpRequis: 300, plante: "Tournesol", emoji: "🌻" },
  { niveau: 5, xpRequis: 500, plante: "Arbre", emoji: "🌳" },
  { niveau: 6, xpRequis: 800, plante: "Palmier", emoji: "🌴" },
  { niveau: 7, xpRequis: 1200, plante: "Cactus", emoji: "🌵" },
  { niveau: 8, xpRequis: 1700, plante: "Champignon", emoji: "🍄" },
  { niveau: 9, xpRequis: 2300, plante: "Hibiscus", emoji: "🌺" },
  { niveau: 10, xpRequis: 3000, plante: "Sapin", emoji: "🌲" },
];

const XP_PAR_ACTION: Record<ActionXp, number> = {
  repas_planifie: 5,
  course_cochee: 2,
  recette_ajoutee: 10,
  recette_validee: 15,
  semaine_complete: 50,
};

/** Retourne les XP gagnés pour une action. */
export function xpPourAction(action: ActionXp): number {
  return XP_PAR_ACTION[action] ?? 0;
}

/** Calcule le niveau actuel, l'XP dans le niveau, l'XP pour le suivant et la progression %. */
export function calculerNiveau(xp: number): {
  niveau: number;
  xpActuel: number;
  xpPourSuivant: number;
  progression: number;
} {
  const xpSafe = Math.max(0, typeof xp === "number" && !isNaN(xp) ? xp : 0);

  // Trouver le niveau le plus élevé atteint
  let niveauActuel = NIVEAUX[0];
  for (const n of NIVEAUX) {
    if (xpSafe >= n.xpRequis) {
      niveauActuel = n;
    } else {
      break;
    }
  }

  const indexActuel = NIVEAUX.indexOf(niveauActuel);
  const niveauSuivant = NIVEAUX[indexActuel + 1];

  const xpActuel = xpSafe - niveauActuel.xpRequis;
  const xpPourSuivant = niveauSuivant ? niveauSuivant.xpRequis : niveauActuel.xpRequis;
  const xpDansNiveau = niveauSuivant ? niveauSuivant.xpRequis - niveauActuel.xpRequis : 1;

  const progression = niveauSuivant
    ? Math.min(100, Math.round((xpActuel / xpDansNiveau) * 100))
    : 100;

  return {
    niveau: niveauActuel.niveau,
    xpActuel: xpSafe,
    xpPourSuivant: xpPourSuivant,
    progression,
  };
}

/** Retourne toutes les plantes débloquées pour un niveau donné. */
export function plantesDebloquees(xp: number): { emoji: string; nom: string; niveau: number }[] {
  const { niveau } = calculerNiveau(xp);
  return NIVEAUX.filter((n) => n.niveau <= niveau).map((n) => ({
    emoji: n.emoji,
    nom: n.plante,
    niveau: n.niveau,
  }));
}
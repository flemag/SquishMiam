/**
 * Profil du foyer : taille (nombre de portions par défaut) et objectif
 * nutritionnel. Logique pure, testée — l'API et l'UI ne font que la relayer.
 */

export const TAILLE_FOYER_MIN = 1;
export const TAILLE_FOYER_MAX = 12;
export const TAILLE_FOYER_DEFAUT = 1;

export const OBJECTIFS = ["equilibre", "perte_poids", "prise_masse", "sante", "famille"] as const;
export type Objectif = (typeof OBJECTIFS)[number];
export const OBJECTIF_DEFAUT: Objectif = "equilibre";

export const OBJECTIF_LABELS: Record<Objectif, string> = {
  equilibre: "Équilibre",
  perte_poids: "Perdre du poids",
  prise_masse: "Prendre du muscle",
  sante: "Manger plus sain",
  famille: "Plaisir en famille",
};

export const OBJECTIF_DESCRIPTIONS: Record<Objectif, string> = {
  equilibre: "Des repas variés, sans prise de tête.",
  perte_poids: "Des assiettes rassasiantes et légères.",
  prise_masse: "Plus de protéines et d'énergie.",
  sante: "Plus de légumes, moins de produits transformés.",
  famille: "Des plats simples qui plaisent à tout le monde.",
};

/** Nombre de portions : entier borné 1–12, sinon défaut. */
export function normaliserTailleFoyer(valeur: unknown): number {
  const n = typeof valeur === "string" ? Number(valeur) : valeur;
  if (typeof n !== "number" || !Number.isFinite(n)) return TAILLE_FOYER_DEFAUT;
  const entier = Math.round(n);
  if (entier < TAILLE_FOYER_MIN) return TAILLE_FOYER_MIN;
  if (entier > TAILLE_FOYER_MAX) return TAILLE_FOYER_MAX;
  return entier;
}

/** Objectif connu, sinon équilibre (valeur stockée potentiellement ancienne). */
export function objectifDepuisValeur(valeur: unknown): Objectif {
  return typeof valeur === "string" && (OBJECTIFS as readonly string[]).includes(valeur)
    ? (valeur as Objectif)
    : OBJECTIF_DEFAUT;
}

/**
 * Phrase de contexte injectée dans le prompt de Miamz : le compagnon adapte
 * ses conseils à la taille du foyer et à l'objectif, sans jamais culpabiliser.
 */
export function phraseProfil({
  householdSize,
  goal,
}: {
  householdSize: number | null | undefined;
  goal: string | null | undefined;
}): string {
  const portions = normaliserTailleFoyer(householdSize);
  const objectif = objectifDepuisValeur(goal);
  const foyer =
    portions === 1
      ? "L'utilisateur cuisine pour 1 personne (1 portion par repas par défaut)."
      : `L'utilisateur cuisine pour ${portions} personnes (${portions} portions par repas par défaut).`;
  const but =
    objectif === "equilibre"
      ? "Il n'a pas d'objectif nutritionnel particulier : reste varié et gourmand."
      : `Son objectif : ${OBJECTIF_LABELS[objectif].toLowerCase()}. Adapte tes suggestions (ingrédients, équilibre, portions) à cet objectif, avec bienveillance et sans discours culpabilisant.`;
  return `${foyer} ${but}`;
}

export const COUT_BOOST = 3;
export const DUREE_BOOST_JOURS = 7;

/** Vérifie si une recette peut être boostée. */
export function peutBooster({
  tokens,
  isPublic,
  boostedUntil,
  isAuthor,
  now,
}: {
  tokens: number;
  isPublic: boolean;
  boostedUntil: Date | null;
  isAuthor: boolean;
  now: Date;
}): boolean {
  if (!isAuthor) return false;
  if (!isPublic) return false;
  if (tokens < COUT_BOOST) return false;
  // Ne peut pas booster si déjà boostée et non expirée
  if (boostedUntil && boostedUntil > now) return false;
  return true;
}

/** Calcule la date d'expiration du boost. */
export function calculerBoostedUntil(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + DUREE_BOOST_JOURS);
  return d;
}

/** Vérifie si un boost est actif. */
export function estBoostee(boostedUntil: Date | null, now: Date): boolean {
  if (!boostedUntil) return false;
  return boostedUntil > now;
}
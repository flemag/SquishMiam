/**
 * Utilitaires de semaine — tout en UTC pour éviter les décalages de fuseau.
 * Semaine ISO : lundi = premier jour.
 */

export function weekStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const jour = d.getUTCDay(); // 0 = dimanche
  const decalage = jour === 0 ? 6 : jour - 1;
  d.setUTCDate(d.getUTCDate() - decalage);
  return d;
}

export function getWeekDates(date: Date): Date[] {
  const lundi = weekStart(date);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(lundi);
    d.setUTCDate(d.getUTCDate() + i);
    dates.push(d);
  }
  return dates;
}

export const SLOTS = ["PETIT_DEJEUNER", "DEJEUNER", "DINER"] as const;
export type Slot = (typeof SLOTS)[number];

export const SLOT_LABELS: Record<Slot, string> = {
  PETIT_DEJEUNER: "Petit-déjeuner",
  DEJEUNER: "Déjeuner",
  DINER: "Dîner",
};

/**
 * Les `nb` prochains jours à partir de `depuis` (inclus), en UTC.
 * Sert au choix rapide de date (« aujourd'hui + 6 jours »).
 */
export function prochainsJours(depuis: Date, nb = 7): Date[] {
  const base = new Date(Date.UTC(depuis.getUTCFullYear(), depuis.getUTCMonth(), depuis.getUTCDate()));
  const jours: Date[] = [];
  for (let i = 0; i < nb; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    jours.push(d);
  }
  return jours;
}

export function formatDateIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Date ISO du calendrier LOCAL (pas UTC) : « aujourd'hui » côté utilisateur.
 * À 00 h 30 à Paris, toISOString() renvoie encore la veille.
 */
export function formatDateLocaleIso(d: Date): string {
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

export function formatJourFr(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(d);
}

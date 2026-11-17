/**
 * Registre des thèmes Miamz — pur et testé.
 * Un thème = un id posé sur <html data-theme="…"> ; les valeurs CSS vivent
 * dans globals.css (voir le tableau des palettes dans la spec 2d).
 */

export type ThemeId = "manga" | "doux" | "pique-nique";

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  /** Couleurs des pastilles d'aperçu du sélecteur (fond, accent, trait). */
  apercu: { fond: string; accent: string; trait: string };
};

export const THEME_DEFAUT: ThemeId = "manga";

export const THEMES: ThemeMeta[] = [
  { id: "manga", label: "Manga food truck", apercu: { fond: "#FFF3D6", accent: "#E07A5F", trait: "#3A2E2E" } },
  { id: "doux", label: "Nappe & confiture", apercu: { fond: "#FFF9E6", accent: "#4A6741", trait: "#FFB5C2" } },
  { id: "pique-nique", label: "Pique-nique gingham", apercu: { fond: "#FFF7EA", accent: "#E07A5F", trait: "#FFB5C2" } },
];

/** Id valide → id ; tout le reste (cookie absent, corrompu, injecté) → défaut. */
export function themeDepuisValeur(valeur: string | null | undefined): ThemeId {
  return THEMES.some((t) => t.id === valeur) ? (valeur as ThemeId) : THEME_DEFAUT;
}

const BULLES_PAR_PAGE: { prefixe: string; bulles: string[] }[] = [
  {
    prefixe: "/recettes",
    bulles: ["On cherche une idée ?", "J'ai faim rien qu'à lire ces recettes !", "Ajoute ton plat préféré !"],
  },
  {
    prefixe: "/plan",
    bulles: ["On planifie quoi ce soir ?", "La semaine se remplit, j'adore !", "Un petit dîner en vue ?"],
  },
  {
    prefixe: "/courses",
    bulles: ["N'oublie pas les carottes !", "Une petite gourmandise en plus ?", "Coche au fil du rayon !"],
  },
];

const BULLES_GENERIQUES = ["Miam miam !", "Je surveille la casserole…", "Qu'est-ce qu'on cuisine ?"];

/** Pool de bulles contextuelles pour un chemin (préfixe) ; générique ailleurs. */
export function bullesPourChemin(chemin: string): string[] {
  return BULLES_PAR_PAGE.find((p) => chemin.startsWith(p.prefixe))?.bulles ?? BULLES_GENERIQUES;
}

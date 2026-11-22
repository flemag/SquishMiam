import type { HumeurId } from "@/lib/humeurs";
import type { MiamzSvgProps } from "./svg";

/** Bouche par humeur ; défaut sourire. */
export const BOUCHES: Partial<Record<HumeurId, MiamzSvgProps["bouche"]>> = {
  endormi: "baille",
  affame: "rond",
  surpris: "rond",
  fete: "rond",
};

/**
 * Animation d'humeur : une par (humeur, variante) — l'index du tableau suit
 * pickVariante et VARIANTES_PAR_HUMEUR. Appliquée inline sur le groupe
 * .miamz-anim pour éviter toute guerre de spécificité avec le rebond et
 * prefers-reduced-motion (les keyframes vivent dans globals.css).
 */
export const ANIMATIONS: Record<HumeurId, string[]> = {
  content: [
    "miamz-bob 3.4s ease-in-out infinite",
    "miamz-sway 4.2s ease-in-out infinite",
    "miamz-breathe 3.8s ease-in-out infinite",
    "miamz-tilt 5s ease-in-out infinite",
  ],
  fier: [
    "miamz-pump 2.6s ease-in-out infinite",
    "miamz-pop 2.2s ease-in-out infinite",
    "miamz-bob 3s ease-in-out infinite",
  ],
  decu: [
    "miamz-droop 3.6s ease-in-out infinite",
    "miamz-droop 4.6s ease-in-out infinite",
    "miamz-breathe 5s ease-in-out infinite",
  ],
  affame: [
    "miamz-bob 1.8s ease-in-out infinite",
    "miamz-wiggle 2s ease-in-out infinite",
    "miamz-pop 1.8s ease-in-out infinite",
  ],
  repu: [
    "miamz-breathe 4.4s ease-in-out infinite",
    "miamz-droop 5s ease-in-out infinite",
    "miamz-float 5.5s ease-in-out infinite",
  ],
  endormi: [
    "miamz-snore 5s ease-in-out infinite",
    "miamz-snore 6.5s ease-in-out infinite",
    "none",
  ],
  fete: [
    "miamz-dance 1.8s ease-in-out infinite",
    "miamz-jump 1.4s ease-in-out infinite",
    "miamz-spin 2.2s linear infinite",
    "miamz-wiggle 1.2s ease-in-out infinite",
  ],
  concentre: ["none", "miamz-breathe 4.8s ease-in-out infinite", "miamz-tilt 6s ease-in-out infinite"],
  calin: [
    "miamz-float 4.6s ease-in-out infinite",
    "miamz-sway 5s ease-in-out infinite",
    "miamz-tilt 6s ease-in-out infinite",
  ],
  taquin: [
    "miamz-wiggle 1.8s ease-in-out infinite",
    "miamz-tilt 3.4s ease-in-out infinite",
    "miamz-bob 2.6s ease-in-out infinite",
  ],
  inquiet: [
    "miamz-tremble 1.2s ease-in-out infinite",
    "miamz-tremble 1.6s ease-in-out infinite",
    "miamz-droop 4s ease-in-out infinite",
  ],
  surpris: [
    "miamz-pop 1.2s ease-in-out infinite",
    "miamz-jump 1.6s ease-in-out infinite",
    "miamz-tremble 1s ease-in-out infinite",
  ],
  motive: [
    "miamz-bob 2.4s ease-in-out infinite",
    "miamz-jump 2.2s ease-in-out infinite",
    "miamz-pump 2.4s ease-in-out infinite",
  ],
  relax: [
    "miamz-float 5s ease-in-out infinite",
    "miamz-breathe 5.5s ease-in-out infinite",
    "miamz-sway 6s ease-in-out infinite",
    "miamz-tilt 7s ease-in-out infinite",
  ],
};

/** Animation par défaut d'une humeur (première variante). */
export function animationPourHumeur(humeur: HumeurId): string {
  return ANIMATIONS[humeur]?.[0] ?? ANIMATIONS.content[0];
}

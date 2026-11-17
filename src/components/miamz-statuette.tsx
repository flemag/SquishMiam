import MiamzSvg from "@/components/miamz/svg";

/**
 * Statuette Miamz (niveau 2) — enveloppe fine autour du SVG partagé avec le
 * compagnon. Pose neutre (content, variante 0, regard centré) : rendu
 * identique à l'SVG d'origine, seul le clignement CSS de globals.css l'anime.
 */
export default function MiamzStatuette({ size = 36 }: { size?: number }) {
  return <MiamzSvg taille={size} />;
}

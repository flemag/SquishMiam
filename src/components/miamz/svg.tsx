import type { HumeurId } from "@/lib/humeurs";

/**
 * SVG de Miamz (niveau 2, maquette validée) paramétrable par la pose.
 * Le group `.miamz-anim` porte l'animation d'humeur (keyframes CSS) ;
 * les yeux portent le regard (translation) et le clignement (CSS).
 */
export type MiamzSvgProps = {
  taille: number;
  /** Décalage du regard en "unités regard" (amplifiées pour rester visible). */
  yeux?: { dx: number; dy: number };
  bouche?: "sourire" | "baille" | "rond";
  pose?: HumeurId;
  variante?: number;
  /** Shorthand CSS appliqué inline au groupe .miamz-anim (keyframes du compagnon). */
  animation?: string;
  className?: string;
  /** Accessoire équipé (emoji + position: "tete" ou "corps"). */
  accessoire?: { emoji: string; position: string } | null;
};

/** 1 unité de regard ≈ 4 unités SVG (le viewBox 200 est rendu petit). */
const AMPLITUDE = 4;

export default function MiamzSvg({
  taille,
  yeux = { dx: 0, dy: 0 },
  bouche = "sourire",
  pose = "content",
  variante = 0,
  animation,
  className,
  accessoire = null,
}: MiamzSvgProps) {
  const dx = yeux.dx * AMPLITUDE;
  const dy = yeux.dy * AMPLITUDE;
  return (
    <svg
      viewBox="0 0 200 200"
      width={taille}
      height={taille}
      className={className}
      role="img"
      aria-label="Miamz, ton compagnon repas"
    >
      <defs>
        <radialGradient id="miamz-on2" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F2EDE4" />
        </radialGradient>
      </defs>
      <g className="miamz-anim" data-humeur={pose} data-variante={variante} style={animation ? { animation } : undefined}>
        <path
          d="M100 30 C122 30 150 64 163 108 C170 134 156 166 128 170 L72 170 C44 166 30 134 37 108 C50 64 78 30 100 30 Z"
          fill="url(#miamz-on2)"
          stroke="#E5DCCB"
          strokeWidth="3"
        />
        <ellipse cx="42" cy="132" rx="12" ry="9" fill="#FFFFFF" stroke="#E5DCCB" strokeWidth="3" transform="rotate(30 42 132)" />
        <ellipse cx="158" cy="132" rx="12" ry="9" fill="#FFFFFF" stroke="#E5DCCB" strokeWidth="3" transform="rotate(-30 158 132)" />
        <path
          d="M68 140 L132 140 C135 140 137 142 137 145 L137 163 C137 168 132 170 128 170 L72 170 C68 170 63 168 63 163 L63 145 C63 142 65 140 68 140 Z"
          fill="#3E5C3B"
        />
        <g data-yeux="repos" style={{ transform: `translate(${dx}px, ${dy}px)` }}>
          <g className="miamz-yeux">
            <ellipse cx="74" cy="104" rx="10" ry="13" fill="#3A2E2E" />
            <ellipse cx="126" cy="104" rx="10" ry="13" fill="#3A2E2E" />
            <circle cx="78" cy="99" r="3.5" fill="#FFF" />
            <circle cx="130" cy="99" r="3.5" fill="#FFF" />
          </g>
        </g>
        <ellipse cx="52" cy="124" rx="11" ry="6" fill="#FFB5C2" opacity="0.85" />
        <ellipse cx="148" cy="124" rx="11" ry="6" fill="#FFB5C2" opacity="0.85" />
        {bouche === "sourire" && (
          <path d="M91 122 Q100 132 109 122" stroke="#3A2E2E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        )}
        {bouche === "baille" && <ellipse cx="100" cy="127" rx="6" ry="8" fill="#3A2E2E" />}
        {bouche === "rond" && <circle cx="100" cy="126" r="4.5" fill="#3A2E2E" />}
        <path
          d="M100 30 Q98 18 88 14 Q100 8 106 16 Q112 8 120 14 Q110 20 108 28"
          fill="#7BC96F"
          stroke="#5EA84F"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {accessoire && (
          <g className="miamz-accessoire" style={{ animation: "accessoire-flottement 3s ease-in-out infinite" }}>
            <text
              x={accessoire.position === "tete" ? 100 : 100}
              y={accessoire.position === "tete" ? 22 : 135}
              fontSize={accessoire.position === "tete" ? 28 : 22}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ userSelect: "none" }}
            >
              {accessoire.emoji}
            </text>
          </g>
        )}
      </g>
    </svg>
  );
}

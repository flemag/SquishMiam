/**
 * Statuette Miamz (niveau 2) — SVG statique extrait de
 * docs/superpowers/specs/assets/miamz-evolution.html.
 * Un unique clignement CSS (globals.css) l'anime légèrement.
 */
export default function MiamzStatuette({ size = 36 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Miamz, ton compagnon repas"
    >
      <defs>
        <radialGradient id="miamz-on2" cx="40%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F2EDE4" />
        </radialGradient>
      </defs>
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
      <g className="miamz-yeux">
        <ellipse cx="74" cy="104" rx="10" ry="13" fill="#3A2E2E" />
        <ellipse cx="126" cy="104" rx="10" ry="13" fill="#3A2E2E" />
        <circle cx="78" cy="99" r="3.5" fill="#FFF" />
        <circle cx="130" cy="99" r="3.5" fill="#FFF" />
      </g>
      <ellipse cx="52" cy="124" rx="11" ry="6" fill="#FFB5C2" opacity="0.85" />
      <ellipse cx="148" cy="124" rx="11" ry="6" fill="#FFB5C2" opacity="0.85" />
      <path d="M91 122 Q100 132 109 122" stroke="#3A2E2E" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path
        d="M100 30 Q98 18 88 14 Q100 8 106 16 Q112 8 120 14 Q110 20 108 28"
        fill="#7BC96F"
        stroke="#5EA84F"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Fond animé par thème (plan 2d) — composant serveur : statique + keyframes
 * CSS (transform uniquement), piloté par html[data-theme] via globals.css.
 * Fixe, derrière le contenu (z-index -1), jamais cliquable, aria-hidden.
 */
const DOODLES: { href: string; style: React.CSSProperties }[] = [
  { href: "#fond-onigiri", style: { top: "7%", left: "6%", width: 42, "--r": "-8deg", animationDuration: "17s" } as React.CSSProperties },
  { href: "#fond-oeuf", style: { top: "16%", right: "8%", width: 38, "--r": "10deg", animationDuration: "21s", animationDelay: "-4s" } as React.CSSProperties },
  { href: "#fond-fraise", style: { top: "40%", left: "4%", width: 34, "--r": "6deg", animationDuration: "24s", animationDelay: "-9s" } as React.CSSProperties },
  { href: "#fond-tomate", style: { top: "30%", right: "5%", width: 32, "--r": "-12deg", animationDuration: "19s", animationDelay: "-2s" } as React.CSSProperties },
  { href: "#fond-carotte", style: { top: "58%", left: "10%", width: 36, "--r": "14deg", animationDuration: "22s", animationDelay: "-6s" } as React.CSSProperties },
  { href: "#fond-etoile", style: { top: "70%", right: "12%", width: 28, "--r": "-5deg", animationDuration: "20s", animationDelay: "-11s" } as React.CSSProperties },
  { href: "#fond-onigiri", style: { top: "82%", left: "18%", width: 30, "--r": "9deg", animationDuration: "23s", animationDelay: "-14s" } as React.CSSProperties },
  { href: "#fond-oeuf", style: { top: "84%", right: "30%", width: 26, "--r": "-14deg", animationDuration: "18s", animationDelay: "-7s" } as React.CSSProperties },
];

export default function FondAnime() {
  return (
    <div className="fond-anime" aria-hidden="true">
      <div className="fond-damier" />
      <div className="fond-doodles">
        {DOODLES.map((d, i) => (
          <svg key={i} className="fond-d" style={d.style} viewBox="0 0 40 40">
            <use href={d.href} />
          </svg>
        ))}
      </div>

      {/* Banque de dessins — une seule définition, réutilisée par <use>. */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <symbol id="fond-onigiri" viewBox="0 0 40 40">
            <path d="M20 5 C26 5 33 15 35 24 C36 30 31 35 25 35 L15 35 C9 35 4 30 5 24 C7 15 14 5 20 5 Z" fill="#FDFBF4" stroke="#3A2E2E" strokeWidth="2" />
            <rect x="13" y="25" width="14" height="10" rx="3" fill="#3E5C3B" />
          </symbol>
          <symbol id="fond-oeuf" viewBox="0 0 40 40">
            <ellipse cx="20" cy="20" rx="17" ry="14" fill="#FFFFFF" stroke="#3A2E2E" strokeWidth="2" />
            <circle cx="20" cy="20" r="7" fill="#FFCE45" />
          </symbol>
          <symbol id="fond-fraise" viewBox="0 0 40 40">
            <path d="M20 10 C28 10 33 16 32 24 C31 31 25 36 20 36 C15 36 9 31 8 24 C7 16 12 10 20 10 Z" fill="#E0565F" />
            <path d="M13 10 L20 6 L27 10 L20 13 Z" fill="#4A6741" />
            <circle cx="15" cy="20" r="1.4" fill="#FFF" />
            <circle cx="25" cy="20" r="1.4" fill="#FFF" />
            <circle cx="20" cy="27" r="1.4" fill="#FFF" />
          </symbol>
          <symbol id="fond-tomate" viewBox="0 0 40 40">
            <circle cx="20" cy="22" r="14" fill="#E8503A" />
            <path d="M20 8 L26 12 L20 14 L14 12 Z" fill="#4A6741" />
          </symbol>
          <symbol id="fond-carotte" viewBox="0 0 40 40">
            <path d="M14 12 L26 12 L20 36 Z" fill="#F5A15A" />
            <path d="M20 10 L14 3 M20 10 L20 2 M20 10 L26 3" stroke="#4A6741" strokeWidth="3" strokeLinecap="round" />
          </symbol>
          <symbol id="fond-etoile" viewBox="0 0 40 40">
            <path d="M20 3 L25 15 L38 16 L28 25 L31 37 L20 30 L9 37 L12 25 L2 16 L15 15 Z" fill="#FFD54D" />
          </symbol>
        </defs>
      </svg>
    </div>
  );
}

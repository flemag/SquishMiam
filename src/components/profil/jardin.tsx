"use client";

import { calculerNiveau, plantesDebloquees } from "@/lib/jardin";

export default function Jardin({ xp }: { xp: number }) {
  const { niveau, xpActuel, xpPourSuivant, progression } = calculerNiveau(xp);
  const plantes = plantesDebloquees(xp);

  const messages: Record<number, string> = {
    1: "Bienvenue dans ton jardin ! Chaque action fait pousser une plante.",
    2: "Ça commence à pousser ! Continue comme ça.",
    3: "Ton jardin s'épanouit — bravo !",
    4: "Magnifique ! Tu es un vrai jardinier.",
    5: "Ton jardin est luxuriant — Miamz est fier de toi !",
  };
  const message = messages[Math.min(niveau, 5)] ?? `Niveau ${niveau} — continue comme ça !`;

  return (
    <section className="carte p-4">
      <h2 className="text-base font-semibold text-foreground">Mon jardin XP</h2>
      <p className="mt-1 text-sm text-texte-doux">
        <span className="text-lg font-semibold text-[#4A6741]">{xp}</span> XP — Niveau {niveau}
      </p>
      <p className="mt-1 text-xs text-texte-tres-doux">{message}</p>

      {/* Barre de progression */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-texte-doux">
          <span>{xpActuel} XP</span>
          <span>{xpPourSuivant} XP</span>
        </div>
        <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-[#A8E6CF]/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#4A6741] to-[#A8E6CF] transition-all duration-500"
            style={{ width: `${progression}%` }}
          />
        </div>
      </div>

      {/* Jardin de plantes */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {plantes.map((p, i) => (
          <div
            key={p.niveau}
            className="flex flex-col items-center gap-1 rounded-2xl border border-[#A8E6CF]/30 bg-[#A8E6CF]/5 p-3 text-center"
            style={{
              animation: `pousse 0.6s ease-out ${i * 0.1}s both`,
            }}
          >
            <span
              className="text-3xl"
              style={{
                animation: `fleurit 0.8s ease-out ${i * 0.1 + 0.3}s both`,
              }}
            >
              {p.emoji}
            </span>
            <span className="text-xs font-medium text-foreground">{p.nom}</span>
            <span className="text-[10px] text-texte-tres-doux">Niv. {p.niveau}</span>
          </div>
        ))}
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes pousse {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fleurit {
          from { transform: scale(0.5) rotate(-10deg); opacity: 0.5; }
          to { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
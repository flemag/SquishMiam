"use client";

import { useState } from "react";
import { messageErreur } from "@/lib/erreur-api";
import type { RecetteExtraite } from "@/lib/import-recette";

const EXEMPLES = [
  "Gratin rapide pour 2",
  "Dîner végétarien de saison",
  "Plat familial pas cher",
];

const ASTUCES = [
  "Décris le plat principal, le temps souhaité et le régime si c'est important.",
  "Le nombre de portions est ajusté à la taille de ton foyer.",
  "L'objectif de ton profil (équilibre, perte de poids, etc.) guide les suggestions.",
];

export default function AssistantRecette({
  onBrouillon,
}: {
  onBrouillon: (recette: RecetteExtraite) => void;
}) {
  const [idee, setIdee] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  function choisirExemple(exemple: string) {
    setIdee(exemple);
  }

  async function proposer() {
    if (!idee.trim() || enCours) return;
    setEnCours(true);
    setMessage(null);

    try {
      const res = await fetch("/api/recipes/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idee }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.recette) {
        setMessage({ texte: "Brouillon prêt — ajuste puis enregistre.", erreur: false });
        onBrouillon(data.recette);
      } else {
        setMessage({
          texte: await messageErreur(res, "Miamz n'a pas réussi à écrire cette recette — réessaie ou remplis à la main."),
          erreur: true,
        });
      }
    } catch {
      setMessage({
        texte: "Miamz n'a pas réussi à écrire cette recette — réessaie ou remplis à la main.",
        erreur: true,
      });
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="carte rounded-2xl bg-gradient-to-br from-[#FFF9E6] to-[#A8E6CF]/20 border border-[#A8E6CF]/50 p-4">
      <h2 className="text-sm font-semibold text-foreground">Une idée ? Miamz te prépare un brouillon</h2>

      <textarea
        value={idee}
        onChange={(e) => setIdee(e.target.value)}
        placeholder="Gratin de courgettes pour 2, rapide et végétarien"
        aria-label="Décris ton idée de recette"
        maxLength={300}
        rows={2}
        className="mt-2 champ min-h-[64px] resize-none"
        disabled={enCours}
      />

      <div className="mt-2 flex flex-wrap gap-1.5">
        {EXEMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => choisirExemple(ex)}
            disabled={enCours}
            className="min-h-9 rounded-full px-3 text-xs font-medium border border-bordure bg-white text-texte-doux hover:bg-[#A8E6CF]/30 disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <p className="mt-2 text-[11px] text-texte-tres-doux space-y-0.5">
        {ASTUCES.map((a, i) => (
          <span key={i} className="block">
            💡 {a}
          </span>
        ))}
      </p>

      <button
        type="button"
        onClick={proposer}
        disabled={!idee.trim() || enCours}
        className="mt-3 bouton min-h-11 w-full"
      >
        {enCours ? "Miamz rédige…" : "Proposer une recette"}
      </button>

      {message && (
        <p className={`mt-2 text-sm font-medium ${message.erreur ? "text-danger" : "text-[#4A6741]"}`}>
          {message.texte}
        </p>
      )}

      {message?.erreur && (
        <button
          type="button"
          onClick={proposer}
          disabled={enCours}
          className="mt-2 bouton-secondaire min-h-11 w-full"
        >
          Réessayer
        </button>
      )}
    </div>
  );
}
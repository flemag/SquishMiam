"use client";

import { useState } from "react";
import FeuilleModale from "@/components/ui/feuille-modale";
import { messageErreur } from "@/lib/erreur-api";

type Resultat = {
  conseils: string[];
  suggestion: string | null;
  source: "ia" | "local";
};

/**
 * Analyse Miamz à la demande : un appel IA par clic, repli local côté API.
 * Aucun coût au chargement de la page, aucune bulle proactive.
 */
export default function AnalyseMiamz({
  portee,
  semaine,
  label,
}: {
  portee: "semaine" | "courses";
  semaine: string;
  label: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [chargement, setChargement] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function analyser() {
    setChargement(true);
    setErreur(null);
    setResultat(null);
    try {
      const res = await fetch("/api/miamz/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portee, semaine }),
      });
      if (res.ok) {
        setResultat(await res.json());
      } else {
        setErreur(await messageErreur(res, "Analyse impossible — réessaie."));
      }
    } catch {
      setErreur("Analyse impossible — réessaie.");
    } finally {
      setChargement(false);
    }
  }

  function ouvrir() {
    setOuvert(true);
    analyser();
  }

  function fermer() {
    setOuvert(false);
    setResultat(null);
    setErreur(null);
  }

  return (
    <>
      <button type="button" onClick={ouvrir} className="bouton-secondaire min-h-11" aria-haspopup="dialog">
        {label}
      </button>

      <FeuilleModale
        ouvert={ouvert}
        onFermer={fermer}
        titre={portee === "semaine" ? "Miamz analyse ta semaine" : "Miamz analyse tes courses"}
        footer={
          <button type="button" onClick={fermer} className="bouton min-h-11 w-full">
            Fermer
          </button>
        }
      >
        <div aria-busy={chargement}>
          {chargement && (
            <p role="status" aria-live="polite" className="text-sm text-texte-doux">
              🍙 Miamz réfléchit…
            </p>
          )}

          {erreur && (
            <div className="flex flex-col gap-3">
              <p role="status" aria-live="polite" className="text-sm text-danger">
                {erreur}
              </p>
              <button type="button" onClick={analyser} className="bouton-secondaire min-h-11">
                Réessayer
              </button>
            </div>
          )}

          {resultat && (
            <div className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2">
                {resultat.conseils.map((conseil, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span aria-hidden="true">🍙</span>
                    <span>{conseil}</span>
                  </li>
                ))}
              </ul>

              {resultat.suggestion && (
                <p className="rounded-xl bg-[#A8E6CF]/15 p-3 text-sm text-foreground">
                  <span className="font-semibold text-[#4A6741]">Suggestion : </span>
                  {resultat.suggestion}
                </p>
              )}

              {resultat.source === "local" && (
                <p className="text-xs text-texte-tres-doux">
                  Analyse locale — l&apos;IA est indisponible pour le moment.
                </p>
              )}
            </div>
          )}
        </div>
      </FeuilleModale>
    </>
  );
}

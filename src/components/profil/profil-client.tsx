"use client";

import { useState } from "react";
import {
  OBJECTIFS,
  OBJECTIF_DESCRIPTIONS,
  OBJECTIF_LABELS,
  TAILLE_FOYER_MAX,
  TAILLE_FOYER_MIN,
  type Objectif,
} from "@/lib/profil";
import { messageErreur } from "@/lib/erreur-api";

export default function ProfilClient({
  householdSize: initialTaille,
  goal: initialGoal,
  tokens,
  email,
}: {
  householdSize: number;
  goal: Objectif;
  tokens: number;
  email: string | null;
}) {
  const [taille, setTaille] = useState(initialTaille);
  const [goal, setGoal] = useState<Objectif>(initialGoal);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  const modifie = taille !== initialTaille || goal !== initialGoal;

  async function enregistrer() {
    setEnCours(true);
    setErreur(null);
    setSucces(null);
    try {
      const res = await fetch("/api/profil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdSize: taille, goal }),
      });
      if (res.ok) {
        setSucces("Profil enregistré — Miamz en tiendra compte.");
      } else {
        setErreur(await messageErreur(res, "Enregistrement impossible — réessaie."));
      }
    } catch {
      setErreur("Enregistrement impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-miamz-vert">Mon profil</h1>
        <p className="text-sm text-texte-doux">
          {email ? `Connecté avec ${email}. ` : ""}Ces réglages aident Miamz à personnaliser ses conseils.
        </p>
      </div>

      <section className="carte p-4">
        <h2 className="text-base font-semibold text-foreground">Taille du foyer</h2>
        <p className="mt-1 text-sm text-texte-doux">
          Nombre de portions proposé par défaut quand tu ajoutes un repas ou crées une recette.
        </p>
        <div className="mt-3 flex items-center gap-4">
          <button
            type="button"
            onClick={() => setTaille((t) => Math.max(TAILLE_FOYER_MIN, t - 1))}
            disabled={taille <= TAILLE_FOYER_MIN || enCours}
            aria-label="Moins de personnes"
            className="bouton-secondaire h-11 w-11 px-0"
          >
            −
          </button>
          <span className="min-w-24 text-center text-lg font-semibold">
            {taille} {taille > 1 ? "personnes" : "personne"}
          </span>
          <button
            type="button"
            onClick={() => setTaille((t) => Math.min(TAILLE_FOYER_MAX, t + 1))}
            disabled={taille >= TAILLE_FOYER_MAX || enCours}
            aria-label="Plus de personnes"
            className="bouton-secondaire h-11 w-11 px-0"
          >
            +
          </button>
        </div>
      </section>

      <section className="carte p-4">
        <h2 className="text-base font-semibold text-foreground">Mon objectif</h2>
        <p className="mt-1 text-sm text-texte-doux">Optionnel — aucun jugement, juste des suggestions plus justes.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {OBJECTIFS.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setGoal(o)}
              aria-pressed={goal === o}
              disabled={enCours}
              className={`min-h-11 rounded-xl border p-3 text-left transition ${
                goal === o
                  ? "border-[#4A6741] bg-[#A8E6CF]/25"
                  : "border-bordure bg-white hover:bg-[#A8E6CF]/10"
              }`}
            >
              <span className="block text-sm font-semibold text-foreground">{OBJECTIF_LABELS[o]}</span>
              <span className="mt-0.5 block text-xs text-texte-doux">{OBJECTIF_DESCRIPTIONS[o]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="carte p-4">
        <h2 className="text-base font-semibold text-foreground">Mes jetons</h2>
        <p className="mt-1 text-sm text-texte-doux">
          <span className="text-lg font-semibold text-[#4A6741]">{tokens}</span> jeton{tokens > 1 ? "s" : ""} — gagnés en
          validant les recettes de la communauté.
        </p>
      </section>

      {erreur && (
        <p role="status" aria-live="polite" className="text-sm text-danger">
          {erreur}
        </p>
      )}
      {succes && (
        <p role="status" aria-live="polite" className="text-sm font-medium text-[#4A6741]">
          {succes}
        </p>
      )}

      <button
        type="button"
        onClick={enregistrer}
        disabled={!modifie || enCours}
        className="bouton min-h-11 w-full sm:w-auto"
      >
        {enCours ? "Enregistrement…" : "Enregistrer"}
      </button>
    </div>
  );
}

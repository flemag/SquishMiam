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
import Jardin from "./jardin";

export default function ProfilClient({
  householdSize: initialTaille,
  goal: initialGoal,
  tokens,
  email,
  xp = 0,
  articlesAchetes = [],
  activeTheme: initialTheme = null,
  activeAccessory: initialAccessory = null,
}: {
  householdSize: number;
  goal: Objectif;
  tokens: number;
  email: string | null;
  xp?: number;
  articlesAchetes?: { id: string; type: string; nom: string; metadata: unknown }[];
  activeTheme?: string | null;
  activeAccessory?: string | null;
}) {
  const [taille, setTaille] = useState(initialTaille);
  const [goal, setGoal] = useState<Objectif>(initialGoal);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<string | null>(initialTheme);
  const [activeAccessory, setActiveAccessory] = useState<string | null>(initialAccessory);
  const [themeEnCours, setThemeEnCours] = useState(false);

  const themesAchetes = articlesAchetes.filter((a) => a.type === "theme");
  const accessoiresAchetes = articlesAchetes.filter((a) => a.type === "accessoire");

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

      <Jardin xp={xp} />

      {themesAchetes.length > 0 && (
        <section className="carte p-4">
          <h2 className="text-base font-semibold text-foreground">Mon thème</h2>
          <p className="mt-1 text-sm text-texte-doux">Choisis un thème acheté dans la boutique.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                setThemeEnCours(true);
                try {
                  const res = await fetch("/api/profil/theme", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ theme: "" }),
                  });
                  if (res.ok) setActiveTheme(null);
                } catch { /* ignore */ }
                setThemeEnCours(false);
              }}
              disabled={themeEnCours}
              className={`min-h-9 rounded-full px-3 text-sm font-medium transition ${
                activeTheme === null ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
              }`}
            >
              Défaut
            </button>
            {themesAchetes.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={async () => {
                  setThemeEnCours(true);
                  try {
                    const res = await fetch("/api/profil/theme", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ theme: t.id }),
                    });
                    if (res.ok) setActiveTheme(t.id);
                  } catch { /* ignore */ }
                  setThemeEnCours(false);
                }}
                disabled={themeEnCours}
                className={`min-h-9 rounded-full px-3 text-sm font-medium transition ${
                  activeTheme === t.id ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
                }`}
              >
                {t.nom}
              </button>
            ))}
          </div>
        </section>
      )}

      {accessoiresAchetes.length > 0 && (
        <section className="carte p-4">
          <h2 className="text-base font-semibold text-foreground">Mon accessoire Miamz</h2>
          <p className="mt-1 text-sm text-texte-doux">Choisis un accessoire pour Miamz.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                setThemeEnCours(true);
                try {
                  const res = await fetch("/api/profil/theme", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accessoire: "" }),
                  });
                  if (res.ok) setActiveAccessory(null);
                } catch { /* ignore */ }
                setThemeEnCours(false);
              }}
              disabled={themeEnCours}
              className={`min-h-9 rounded-full px-3 text-sm font-medium transition ${
                activeAccessory === null ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
              }`}
            >
              Aucun
            </button>
            {accessoiresAchetes.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={async () => {
                  setThemeEnCours(true);
                  try {
                    const res = await fetch("/api/profil/theme", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ accessoire: a.id }),
                    });
                    if (res.ok) setActiveAccessory(a.id);
                  } catch { /* ignore */ }
                  setThemeEnCours(false);
                }}
                disabled={themeEnCours}
                className={`min-h-9 rounded-full px-3 text-sm font-medium transition ${
                  activeAccessory === a.id ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
                }`}
              >
                {a.nom}
              </button>
            ))}
          </div>
        </section>
      )}

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

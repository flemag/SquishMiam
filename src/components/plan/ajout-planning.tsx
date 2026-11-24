"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMiamz } from "@/components/miamz/fournisseur";
import {
  formatDateIso,
  formatDateLocaleIso,
  prochainsJours,
  SLOTS,
  SLOT_LABELS,
  type Slot,
} from "@/lib/plan";

const labelJour = (date: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));

/**
 * Formulaire d'ajout rapide au planning, partagé par la fiche recette et le
 * chat Miamz. Gère lui-même le POST /api/plan, les conflits de créneau et le
 * retour visuel ; l'appelant fournit le titre de la fenêtre.
 */
export default function FormulaireAjoutPlanning({
  recette,
  onAjoute,
}: {
  recette: { id: string; title: string };
  onAjoute?: (message: string) => void;
}) {
  const router = useRouter();
  const { emettre } = useMiamz();
  const [jours] = useState(() =>
    prochainsJours(new Date(`${formatDateLocaleIso(new Date())}T00:00:00Z`)).map(formatDateIso)
  );
  const [jour, setJour] = useState(() => jours[0]);
  const [service, setService] = useState<Slot>("DEJEUNER");
  const [portions, setPortions] = useState(1);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);

  async function ajouter() {
    setEnCours(true);
    setErreur(null);
    setSucces(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: jour,
          slot: service,
          recipeId: recette.id,
          servings: portions,
        }),
      });
      if (res.ok) {
        const message = `Ajouté au planning : ${labelJour(jour)} · ${SLOT_LABELS[service]}`;
        emettre("repas-planifie");
        setSucces(message);
        onAjoute?.(message);
        router.refresh();
      } else if (res.status === 409) {
        setErreur("Ce créneau est déjà occupé — choisis un autre jour ou service.");
      } else if (res.status === 404) {
        setErreur("Ajoute d'abord cette recette à tes recettes pour la planifier.");
      } else {
        setErreur("Ajout impossible — réessaie.");
      }
    } catch {
      setErreur("Ajout impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          value={jour}
          onChange={(e) => setJour(e.target.value)}
          aria-label="Jour"
          className="champ min-h-11 min-w-0 flex-1"
          disabled={enCours}
        >
          {jours.map((d) => (
            <option key={d} value={d}>
              {labelJour(d)}
            </option>
          ))}
        </select>
        <select
          value={service}
          onChange={(e) => setService(e.target.value as Slot)}
          aria-label="Service"
          className="champ min-h-11 min-w-0 flex-1"
          disabled={enCours}
        >
          {SLOTS.map((s) => (
            <option key={s} value={s}>
              {SLOT_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-texte-doux">Portions</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPortions((p) => Math.max(1, p - 1))}
            disabled={portions <= 1 || enCours}
            aria-label="Moins de portions"
            className="bouton-secondaire h-11 w-11 px-0"
          >
            −
          </button>
          <span className="min-w-6 text-center font-semibold">{portions}</span>
          <button
            type="button"
            onClick={() => setPortions((p) => Math.min(12, p + 1))}
            disabled={portions >= 12 || enCours}
            aria-label="Plus de portions"
            className="bouton-secondaire h-11 w-11 px-0"
          >
            +
          </button>
        </div>
      </div>

      {erreur && <p className="text-sm text-danger">{erreur}</p>}
      {succes && (
        <p role="status" aria-live="polite" className="text-sm font-medium text-[#4A6741]">
          {succes}
        </p>
      )}

      <button
        type="button"
        onClick={ajouter}
        disabled={enCours}
        className="bouton min-h-11 w-full"
      >
        {enCours ? "Ajout…" : `Ajouter ${labelJour(jour)}`}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { peutPartager, estValidee } from "@/lib/boutique";
import FeuilleModale from "@/components/ui/feuille-modale";

type RecetteCarte = {
  id: string;
  title: string;
  servings: number;
  minutes: number | null;
  tags: string[];
  categorieNom?: string | null;
  isPublic: boolean;
  validatedAt: Date | string | null;
  validationCount: number;
  isSharedCopy: boolean;
  createdById: string;
  validators: string[];
};

const REASONS = ["spam", "inapproprié", "autre"] as const;
type Reason = (typeof REASONS)[number];

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  "inapproprié": "Contenu inapproprié",
  autre: "Autre",
};

/**
 * Carte recette : un unique <button> (plus d'interactif imbriqué) — le tap
 * ouvre la fiche en bottom sheet ; la suppression vit dans la fiche.
 * Badges + boutons d'action selon le statut boutique.
 */
export default function RecetteCard({
  recette,
  onOuvrir,
  currentUserId,
}: {
  recette: RecetteCarte;
  onOuvrir: () => void;
  currentUserId: string;
}) {
  const router = useRouter();
  const [dialogue, setDialogue] = useState<{
    type: "publier" | "retirer" | "valider" | "partager" | "signaler";
    recette: RecetteCarte;
    reason?: string;
    detail?: string;
  } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const estAuteur = recette.createdById === currentUserId;
  const estValideeRecette = estValidee(recette.validationCount);
  const peutPartagerRecette = peutPartager({ validatedAt: recette.validatedAt ? new Date(recette.validatedAt) : null });

  function ouvrirPublier() {
    if (!estAuteur || recette.isPublic) return;
    setErreur(null);
    setDialogue({ type: "publier", recette });
  }

  function ouvrirRetirer() {
    if (!estAuteur || !recette.isPublic) return;
    setErreur(null);
    setDialogue({ type: "retirer", recette });
  }

  function ouvrirValider() {
    if (estAuteur || !recette.isPublic || recette.validators?.includes(currentUserId)) return;
    setErreur(null);
    setDialogue({ type: "valider", recette });
  }

  function ouvrirPartager() {
    if (!estValideeRecette || !peutPartagerRecette || recette.isSharedCopy) return;
    setErreur(null);
    setDialogue({ type: "partager", recette });
  }

  function ouvrirSignaler() {
    if (estAuteur || !recette.isPublic) return;
    setErreur(null);
    setDialogue({ type: "signaler", recette, reason: "autre" });
  }

  function fermer() {
    if (enCours) return;
    setDialogue(null);
    setErreur(null);
  }

  async function publier() {
    if (!dialogue || dialogue.type !== "publier") return;
    const { id } = dialogue.recette;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/recipes/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: true }),
      });
      if (res.ok) {
        fermer();
        router.refresh();
      } else {
        setErreur("Publication impossible — réessaie.");
      }
    } catch {
      setErreur("Publication impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function retirer() {
    if (!dialogue || dialogue.type !== "retirer") return;
    const { id } = dialogue.recette;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/recipes/${id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publish: false }),
      });
      if (res.ok) {
        fermer();
        router.refresh();
      } else {
        setErreur("Retrait impossible — réessaie.");
      }
    } catch {
      setErreur("Retrait impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function valider() {
    if (!dialogue || dialogue.type !== "valider") return;
    const { id } = dialogue.recette;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/recipes/${id}/validate`, { method: "POST" });
      if (res.ok) {
        fermer();
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErreur(data.error || "Validation impossible — réessaie.");
      }
    } catch {
      setErreur("Validation impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function partager() {
    if (!dialogue || dialogue.type !== "partager") return;
    const { id } = dialogue.recette;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/recipes/${id}/share`, { method: "POST" });
      if (res.ok) {
        fermer();
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setErreur(data.error || "Partage impossible — réessaie.");
      }
    } catch {
      setErreur("Partage impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function signaler() {
    if (!dialogue || dialogue.type !== "signaler") return;
    const { recette, reason, detail } = dialogue;
    const { id } = recette;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/recipes/${id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail }),
      });
      if (res.ok) {
        fermer();
      } else {
        setErreur("Signalement impossible — réessaie.");
      }
    } catch {
      setErreur("Signalement impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  const REASON_LABELS: Record<string, string> = {
    spam: "Spam",
    "inapproprié": "Contenu inapproprié",
    autre: "Autre",
  };

  return (
    <>
      <button
        type="button"
        onClick={onOuvrir}
        className="carte w-full p-5 text-left transition"
      >
        {/* Badges */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {estValideeRecette && (
            <span className="badge-validée flex items-center gap-1 rounded-full bg-[#A8E6CF]/20 px-2 py-0.5 text-xs font-medium text-[#2e5340]">
              ✅ Validée par la communauté
            </span>
          )}
          {estAuteur && recette.isPublic && (
            <span className="badge-publiée flex items-center gap-1 rounded-full bg-[#C9B6E4]/20 px-2 py-0.5 text-xs font-medium text-[#43325e]">
              🌐 Publiée sur la boutique
            </span>
          )}
        </div>

        <h3 className="font-semibold text-foreground">{recette.title}</h3>
        <p className="mt-1 text-sm text-texte-doux">
          {recette.servings} portion{recette.servings > 1 ? "s" : ""}
          {recette.minutes ? ` · ${recette.minutes} min` : ""}
        </p>

        {recette.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {recette.tags.map((t) => (
              <span key={t} className="puce">
                {t}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Modales d'action */}
      {dialogue?.type === "publier" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Publier sur la boutique"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={fermer} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">
                Annuler
              </button>
              <button type="button" onClick={publier} disabled={enCours} className="bouton min-h-11 flex-1">
                {enCours ? "Publication…" : "Publier"}
              </button>
            </div>
          }
        >
          <p className="text-sm text-texte-doux">
            Publier « {dialogue.recette.title} » sur la boutique ? Elle sera visible par tous et pourra être validée par la communauté.
          </p>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}

      {dialogue?.type === "retirer" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Retirer de la boutique"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={fermer} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">
                Annuler
              </button>
              <button type="button" onClick={retirer} disabled={enCours} className="bouton-danger min-h-11 flex-1">
                {enCours ? "Retrait…" : "Retirer"}
              </button>
            </div>
          }
        >
          <p className="text-sm text-texte-doux">
            Retirer « {dialogue.recette.title} » de la boutique ? Elle ne sera plus visible ni validable.
          </p>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}

      {dialogue?.type === "valider" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Valider cette recette"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={fermer} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">
                Annuler
              </button>
              <button type="button" onClick={valider} disabled={enCours} className="bouton min-h-11 flex-1">
                {enCours ? "Validation…" : "Valider"}
              </button>
            </div>
          }
        >
          <p className="text-sm text-texte-doux">
            Valider « {dialogue.recette.title} » ? Tu gagnes 1 jeton (max 10).
          </p>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}

      {dialogue?.type === "partager" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Ajouter à mes recettes"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={fermer} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">
                Annuler
              </button>
              <button type="button" onClick={partager} disabled={enCours} className="bouton min-h-11 flex-1">
                {enCours ? "Ajout…" : "Ajouter à mes recettes"}
              </button>
            </div>
          }
        >
          <p className="text-sm text-texte-doux">
            Ajouter « {dialogue.recette.title} » à ta cuisine ? Tu pourras la planifier mais pas la modifier (copie lecture seule).
          </p>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}

      {dialogue?.type === "signaler" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Signaler cette recette"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={fermer} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">
                Annuler
              </button>
              <button type="button" onClick={signaler} disabled={enCours} className="bouton min-h-11 flex-1">
                {enCours ? "Signalement…" : "Signaler"}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Raison</label>
            <select
              value={dialogue.reason}
              onChange={(e) => setDialogue({ ...dialogue!, reason: e.target.value as "spam" | "inapproprié" | "autre" })}
              disabled={enCours}
              className="champ min-h-11 w-full"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {REASON_LABELS[r as keyof typeof REASON_LABELS]}
                </option>
              ))}
            </select>
            <label className="text-sm font-medium">Détail (optionnel)</label>
            <textarea
              value={dialogue.detail || ""}
              onChange={(e) => setDialogue({ ...dialogue!, detail: e.target.value })}
              disabled={enCours}
              rows={3}
              className="champ w-full"
              placeholder="Explications supplémentaires…"
            />
          </div>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}

      {/* Barre d'actions (boutons conditionnels) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {estAuteur && !recette.isPublic && (
          <button type="button" onClick={(e) => { e.stopPropagation(); ouvrirPublier(); }} disabled={enCours} className="bouton min-h-9 px-3 text-sm">
            Publier
          </button>
        )}
        {estAuteur && recette.isPublic && (
          <button type="button" onClick={(e) => { e.stopPropagation(); ouvrirRetirer(); }} disabled={enCours} className="bouton-secondaire min-h-9 px-3 text-sm">
            Retirer
          </button>
        )}
        {!estAuteur && recette.isPublic && !estValideeRecette && (
          <button type="button" onClick={(e) => { e.stopPropagation(); ouvrirValider(); }} disabled={enCours} className="bouton min-h-9 px-3 text-sm">
            Valider ({recette.validationCount}/3)
          </button>
        )}
        {!estAuteur && estValideeRecette && peutPartagerRecette && !recette.isSharedCopy && (
          <button type="button" onClick={(e) => { e.stopPropagation(); ouvrirPartager(); }} disabled={enCours} className="bouton min-h-9 px-3 text-sm">
            Ajouter à mes recettes
          </button>
        )}
        {!estAuteur && recette.isPublic && (
          <button type="button" onClick={(e) => { e.stopPropagation(); ouvrirSignaler(); }} disabled={enCours} className="bouton-danger min-h-9 px-3 text-sm">
            Signaler
          </button>
        )}
      </div>
    </>
  );
}
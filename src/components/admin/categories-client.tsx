"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIE_AUTRE } from "@/lib/categories";
import { messageErreur } from "@/lib/erreur-api";
import FeuilleModale from "@/components/ui/feuille-modale";

export type CategorieAdminVue = {
  id: string;
  nom: string;
  cle: string;
  masquee: boolean;
  recettes: number;
};

type Dialogue =
  | { type: "renommer"; categorie: CategorieAdminVue }
  | { type: "fusionner"; categorie: CategorieAdminVue; cibleId: string }
  | null;

export default function CategoriesClient({ categories }: { categories: CategorieAdminVue[] }) {
  const router = useRouter();
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [nom, setNom] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [collision, setCollision] = useState<{ id: string; nom: string } | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);
  const [bascule, setBascule] = useState<string | null>(null);
  const [erreurBascule, setErreurBascule] = useState<{ id: string; message: string } | null>(null);

  function ouvrirRenommage(c: CategorieAdminVue) {
    setNom(c.nom);
    setErreur(null);
    setCollision(null);
    setDialogue({ type: "renommer", categorie: c });
  }

  function ouvrirFusion(c: CategorieAdminVue, cibleId = "") {
    setErreur(null);
    setDialogue({ type: "fusionner", categorie: c, cibleId });
  }

  function fermer() {
    if (enCours) return;
    setDialogue(null);
    setErreur(null);
    setCollision(null);
    setNom("");
  }

  async function renommer() {
    if (!dialogue || dialogue.type !== "renommer") return;
    const { id } = dialogue.categorie;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nom.trim() }),
      });
      if (res.ok) {
        setMessage({ texte: `« ${nom.trim()} » a été enregistrée.`, erreur: false });
        fermer();
        router.refresh();
      } else if (res.status === 409) {
        const data = await res.json();
        if (data.collision) {
          setCollision(data.collision);
          setErreur("Cette catégorie existe déjà");
        } else {
          setErreur(await messageErreur(res, "Cette catégorie existe déjà"));
        }
      } else {
        setErreur(await messageErreur(res, "Renommage impossible — réessaie."));
      }
    } catch {
      setErreur("Renommage impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function fusionner() {
    if (!dialogue || dialogue.type !== "fusionner") return;
    if (!dialogue.cibleId) {
      setErreur("Choisis une catégorie cible.");
      return;
    }
    const { id } = dialogue.categorie;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}/fusionner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cibleId: dialogue.cibleId }),
      });
      if (res.ok) {
        const data = await res.json();
        const cible = categories.find((c) => c.id === dialogue!.cibleId);
        setMessage({
          texte: `« ${dialogue.categorie.nom} » a été fusionnée dans « ${cible?.nom ?? "cible"} » (${data.deplacees} recette(s) déplacée(s)).`,
          erreur: false,
        });
        fermer();
        router.refresh();
      } else {
        setErreur(await messageErreur(res, "Fusion impossible — réessaie."));
      }
    } catch {
      setErreur("Fusion impossible — réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  async function basculer(c: CategorieAdminVue) {
    setBascule(c.id);
    setErreurBascule(null);
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masquee: !c.masquee }),
      });
      if (res.ok) {
        setMessage({
          texte: `« ${c.nom} » est maintenant ${c.masquee ? "visible" : "masquée"}.`,
          erreur: false,
        });
        router.refresh();
      } else {
        setErreurBascule({ id: c.id, message: await messageErreur(res, "Impossible — réessaie.") });
      }
    } catch {
      setErreurBascule({ id: c.id, message: "Impossible — réessaie." });
    } finally {
      setBascule(null);
    }
  }

  const ciblesFusion = categories
    .filter((c) => c.id !== dialogue?.categorie.id && !c.masquee)
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <div>
      {message && (
        <div role="status" aria-live="polite" className={`mb-4 text-sm ${message.erreur ? "text-danger" : "text-[#4A6741]"} `}>
          {message.texte}
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {categories.map((c) => (
          <li key={c.id} className="carte p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{c.nom}</span>
                  {c.masquee && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-texte-doux">
                      masquée
                    </span>
                  )}
                </div>
                <span className="text-xs text-texte-doux">{c.recettes} recette(s)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => ouvrirRenommage(c)}
                  disabled={enCours}
                  className="bouton-secondaire min-h-11 shrink-0"
                >
                  Renommer
                </button>
                <button
                  onClick={() => basculer(c)}
                  disabled={enCours || bascule === c.id || c.id === CATEGORIE_AUTRE}
                  className="bouton-secondaire min-h-11 shrink-0"
                  title={c.id === CATEGORIE_AUTRE ? "La catégorie « Autre » est la catégorie de repli : elle ne peut pas être masquée." : undefined}
                >
                  {bascule === c.id
                    ? c.masquee
                      ? "Affichage…"
                      : "Masquage…"
                    : c.masquee
                      ? "Afficher"
                      : "Masquer"}
                </button>
                <button
                  onClick={() => ouvrirFusion(c)}
                  disabled={enCours}
                  className="bouton-secondaire min-h-11 shrink-0"
                >
                  Fusionner
                </button>
              </div>
            </div>
            {erreurBascule?.id === c.id && (
              <p role="status" aria-live="polite" className="mt-2 text-xs text-danger">
                {erreurBascule.message}
              </p>
            )}
            {c.id === CATEGORIE_AUTRE && (
              <p className="mt-2 text-xs text-texte-tres-doux">
                Catégorie de repli : elle ne peut être ni masquée ni fusionnée comme source.
              </p>
            )}
          </li>
        ))}
      </ul>

      {categories.length === 0 && (
        <p className="text-sm text-texte-tres-doux">Aucune catégorie.</p>
      )}

      {dialogue?.type === "renommer" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Renommer la catégorie"
          footer={
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fermer}
                disabled={enCours}
                className="bouton-secondaire min-h-11 flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={renommer}
                disabled={enCours || !nom.trim()}
                className="bouton min-h-11 flex-1"
              >
                {enCours ? "Renommage…" : "Renommer"}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <label htmlFor="nom-categorie" className="text-sm font-medium">
              Nouveau nom
            </label>
            <input
              id="nom-categorie"
              type="text"
              maxLength={60}
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="champ mt-1 w-full"
              autoFocus
            />
            <div className="text-right text-xs text-texte-tres-doux">
              {nom.trim().length}/60
            </div>
            {erreur && (
              <p role="status" aria-live="polite" className="text-sm text-danger">
                {erreur}
              </p>
            )}
            {collision && (
              <div className="flex flex-col gap-2">
                <p role="status" aria-live="polite" className="text-sm text-danger">
                  Cette catégorie existe déjà
                </p>
                <button
                  type="button"
                  onClick={() => ouvrirFusion(dialogue.categorie, collision.id)}
                  disabled={enCours}
                  className="bouton-secondaire min-h-11"
                >
                  Fusionner avec « {collision.nom} »
                </button>
              </div>
            )}
          </div>
        </FeuilleModale>
      )}

      {dialogue?.type === "fusionner" && (
        <FeuilleModale
          ouvert
          onFermer={fermer}
          titre="Fusionner la catégorie"
          footer={
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={fermer}
                disabled={enCours}
                className="bouton-secondaire min-h-11 flex-1"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={fusionner}
                disabled={enCours || !dialogue.cibleId}
                className="bouton min-h-11 flex-1"
              >
                {enCours ? "Fusion…" : "Fusionner"}
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm text-texte-doux">
              Les {dialogue.categorie.recettes} recette(s) de « {dialogue.categorie.nom} »
              passeront dans la catégorie choisie, puis « {dialogue.categorie.nom} » sera supprimée.
            </p>
            <label htmlFor="cible-fusion" className="text-sm font-medium">
              Catégorie cible
            </label>
            <select
              id="cible-fusion"
              value={dialogue.cibleId}
              onChange={(e) => setDialogue({ ...dialogue, cibleId: e.target.value })}
              className="champ mt-1 w-full"
            >
              <option value="">Choisir…</option>
              {ciblesFusion.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} ({c.recettes})
                </option>
              ))}
            </select>
            {erreur && (
              <p role="status" aria-live="polite" className="text-sm text-danger">
                {erreur}
              </p>
            )}
          </div>
        </FeuilleModale>
      )}
    </div>
  );
}
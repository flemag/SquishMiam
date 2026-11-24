"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { messageErreur } from "@/lib/erreur-api";

export type RecetteAdminVue = {
  id: string;
  titre: string;
  auteur: string;
  statut: "privee" | "en_attente" | "publiee";
  validations: number;
  isPublic: boolean;
  publishedAt: Date | string | null;
};

const BADGE_STYLES: Record<string, string> = {
  publiee: "bg-[#A8E6CF] text-[#2e5340]",
  en_attente: "bg-[#C9B6E4] text-[#43325e]",
  privee: "bg-gray-200 text-texte-doux",
};

const BADGE_LABEL: Record<string, string> = {
  publiee: "Publiée",
  en_attente: "En attente",
  privee: "Privée",
};

export default function BoutiqueAdmin({ recettes: initiales }: { recettes: RecetteAdminVue[] }) {
  const router = useRouter();
  const [recherche, setRecherche] = useState("");
  const [enCours, setEnCours] = useState<string | null>(null);
  const [confirmRetrait, setConfirmRetrait] = useState<string | null>(null);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  const recettes = initiales.filter((r) => {
    const q = recherche.trim().toLowerCase();
    if (!q) return true;
    return r.titre.toLowerCase().includes(q) || r.auteur.toLowerCase().includes(q);
  });

  async function publier(id: string) {
    setEnCours(id);
    setMessage(null);
    setConfirmRetrait(null);
    try {
      const res = await fetch(`/api/admin/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publie: true }),
      });
      if (res.ok) {
        setMessage({ texte: "Recette publiée d'office ✨", erreur: false });
        router.refresh();
      } else {
        setMessage({ texte: await messageErreur(res, "Publication impossible — réessaie."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Publication impossible — réessaie.", erreur: true });
    } finally {
      setEnCours(null);
    }
  }

  async function retirer(id: string) {
    setEnCours(id);
    setMessage(null);
    setConfirmRetrait(null);
    try {
      const res = await fetch(`/api/admin/recipes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publie: false }),
      });
      if (res.ok) {
        setMessage({ texte: "Recette retirée de la boutique.", erreur: false });
        router.refresh();
      } else {
        setMessage({ texte: await messageErreur(res, "Retrait impossible — réessaie."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Retrait impossible — réessaie.", erreur: true });
    } finally {
      setEnCours(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un titre ou un auteur…"
        aria-label="Rechercher une recette"
        className="champ w-full rounded-full"
      />

      {message && (
        <p className={`text-sm font-medium ${message.erreur ? "text-danger" : "text-[#4A6741]"}`}>
          {message.texte}
        </p>
      )}

      {recettes.length === 0 ? (
        <p className="text-sm text-texte-doux">Aucune recette.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {recettes.map((r) => (
            <li key={r.id} className="carte flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">{r.titre}</p>
                  <p className="text-xs text-texte-doux truncate">{r.auteur}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_STYLES[r.statut]}`}>
                  {BADGE_LABEL[r.statut]}
                </span>
              </div>
              <p className="text-xs text-texte-tres-doux">
                {r.validations} validation{r.validations > 1 ? "s" : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {r.statut !== "publiee" && (
                  <button
                    type="button"
                    onClick={() => publier(r.id)}
                    disabled={enCours === r.id}
                    className="bouton min-h-11 px-4 text-xs"
                  >
                    {enCours === r.id ? "Publication…" : "Publier d'office"}
                  </button>
                )}
                {r.statut !== "privee" && (
                  confirmRetrait === r.id ? (
                    <button
                      type="button"
                      onClick={() => retirer(r.id)}
                      disabled={enCours === r.id}
                      className="bouton-danger min-h-11 px-4 text-xs"
                    >
                      {enCours === r.id ? "Retrait…" : "Confirmer le retrait"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRetrait(r.id)}
                      disabled={enCours === r.id}
                      className="bouton-secondaire min-h-11 px-4 text-xs"
                    >
                      Retirer
                    </button>
                  )
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
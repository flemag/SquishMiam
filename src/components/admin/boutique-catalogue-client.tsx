"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { messageErreur } from "@/lib/erreur-api";

type Article = {
  id: string;
  type: string;
  nom: string;
  description: string;
  prix: number;
  image: string | null;
  metadata: unknown;
  actif: boolean;
  createdAt: string;
  dejaAchete?: boolean;
};

const TYPES = [
  { value: "theme", label: "Thème" },
  { value: "accessoire", label: "Accessoire" },
  { value: "pack", label: "Pack de recettes" },
];

const TYPE_LABELS: Record<string, string> = {
  theme: "Thème",
  accessoire: "Accessoire",
  pack: "Pack",
};

const TYPE_ICONS: Record<string, string> = {
  theme: "🎨",
  accessoire: "/jpeg",
  pack: "📦",
};

export default function BoutiqueCatalogueClient({ articles: initiaux }: { articles: Article[] }) {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>(initiaux);
  const [edition, setEdition] = useState<Article | null>(null);
  const [creation, setCreation] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null);

  // Form state
  const [type, setType] = useState("theme");
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [prix, setPrix] = useState(0);
  const [image, setImage] = useState("");
  const [metadata, setMetadata] = useState("{}");

  function resetForm() {
    setType("theme");
    setNom("");
    setDescription("");
    setPrix(0);
    setImage("");
    setMetadata("{}");
    setEdition(null);
    setCreation(false);
  }

  function ouvrirCreation() {
    resetForm();
    setCreation(true);
  }

  function ouvrirEdition(a: Article) {
    setEdition(a);
    setCreation(false);
    setType(a.type);
    setNom(a.nom);
    setDescription(a.description);
    setPrix(a.prix);
    setImage(a.image ?? "");
    setMetadata(JSON.stringify(a.metadata ?? {}, null, 2));
  }

  async function enregistrer() {
    if (!nom.trim() || enCours) return;
    setEnCours(true);
    setMessage(null);
    try {
      let meta: unknown;
      try {
        meta = JSON.parse(metadata);
      } catch {
        setMessage({ texte: "Metadata JSON invalide.", erreur: true });
        setEnCours(false);
        return;
      }

      const body = { type, nom: nom.trim(), description: description.trim(), prix, image: image.trim() || null, metadata: meta };
      const url = edition ? `/api/admin/boutique/${edition.id}` : "/api/admin/boutique";
      const method = edition ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage({ texte: edition ? "Article modifié." : "Article créé.", erreur: false });
        resetForm();
        router.refresh();
      } else {
        setMessage({ texte: await messageErreur(res, "Enregistrement impossible."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Enregistrement impossible — réessaie.", erreur: true });
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer(id: string) {
    if (enCours) return;
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/boutique/${id}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        setMessage({ texte: data.desactive ? "Article désactivé (achats existants)." : "Article supprimé.", erreur: false });
        router.refresh();
      } else {
        setMessage({ texte: await messageErreur(res, "Suppression impossible."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Suppression impossible — réessaie.", erreur: true });
    } finally {
      setEnCours(false);
    }
  }

  async function basculerActif(a: Article) {
    if (enCours) return;
    setEnCours(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/boutique/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: !a.actif }),
      });
      if (res.ok) {
        setMessage({ texte: a.actif ? "Article désactivé." : "Article activé.", erreur: false });
        router.refresh();
      } else {
        setMessage({ texte: await messageErreur(res, "Action impossible."), erreur: true });
      }
    } catch {
      setMessage({ texte: "Action impossible — réessaie.", erreur: true });
    } finally {
      setEnCours(false);
    }
  }

  const afficherFormulaire = creation || edition !== null;

  return (
    <div className="flex flex-col gap-4">
      {message && (
        <p className={`text-sm font-medium ${message.erreur ? "text-danger" : "text-[#4A6741]"}`}>
          {message.texte}
        </p>
      )}

      {!afficherFormulaire ? (
        <button type="button" onClick={ouvrirCreation} className="bouton min-h-11 self-start">
          + Nouvel article
        </button>
      ) : (
        <div className="carte flex flex-col gap-3 p-4">
          <h3 className="text-sm font-semibold text-foreground">
            {edition ? "Modifier l'article" : "Nouvel article"}
          </h3>

          <label className="flex flex-col gap-1 text-sm text-texte-doux">
            Type
            <select value={type} onChange={(e) => setType(e.target.value)} className="champ min-h-11" disabled={enCours}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-texte-doux">
            Nom
            <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Thème Rose" className="champ" disabled={enCours} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-texte-doux">
            Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="champ" disabled={enCours} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-texte-doux">
            Prix (jetons, 0 = gratuit)
            <input type="number" min={0} max={100} value={prix} onChange={(e) => setPrix(Number(e.target.value))} className="champ" disabled={enCours} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-texte-doux">
            Image (URL, optionnel)
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." className="champ" disabled={enCours} />
          </label>

          <label className="flex flex-col gap-1 text-sm text-texte-doux">
            Metadata (JSON)
            <textarea value={metadata} onChange={(e) => setMetadata(e.target.value)} rows={4} className="champ font-mono text-xs" disabled={enCours} />
          </label>

          <div className="flex gap-2">
            <button type="button" onClick={enregistrer} disabled={!nom.trim() || enCours} className="bouton min-h-11 flex-1">
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={resetForm} disabled={enCours} className="bouton-secondaire min-h-11">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Liste des articles */}
      <div className="flex flex-col gap-3">
        {initiaux.length === 0 ? (
          <p className="text-sm text-texte-doux">Aucun article. Crée-en un !</p>
        ) : (
          initiaux.map((a) => (
            <div key={a.id} className="carte flex flex-col gap-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">
                    {TYPE_ICONS[a.type] ?? "📦"} {a.nom}
                  </p>
                  <p className="text-xs text-texte-doux">{TYPE_LABELS[a.type] ?? a.type} · {a.prix === 0 ? "Gratuit" : `${a.prix} jetons`}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {a.dejaAchete && (
                    <span className="rounded-full bg-[#A8E6CF]/30 px-2 py-0.5 text-xs font-medium text-[#2e5340]">
                      ✓ Possédé
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.actif ? "bg-[#A8E6CF] text-[#2e5340]" : "bg-gray-200 text-texte-doux"}`}>
                    {a.actif ? "Actif" : "Inactif"}
                  </span>
                </div>
              </div>
              {a.description && <p className="text-sm text-texte-doux">{a.description}</p>}
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => ouvrirEdition(a)} disabled={enCours} className="bouton-secondaire min-h-9 px-3 text-xs">
                  Modifier
                </button>
                <button type="button" onClick={() => basculerActif(a)} disabled={enCours} className="bouton-secondaire min-h-9 px-3 text-xs">
                  {a.actif ? "Désactiver" : "Activer"}
                </button>
                <button type="button" onClick={() => supprimer(a.id)} disabled={enCours} className="bouton-danger min-h-9 px-3 text-xs">
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
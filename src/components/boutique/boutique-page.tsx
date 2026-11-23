"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { CategorieVue } from "@/lib/categories";
import FeuilleModale from "@/components/ui/feuille-modale";

export type RecetteBoutique = {
  id: string;
  title: string;
  minutes: number | null;
  tags: string[];
  validationCount: number;
  publishedAt: string | null;
  createdBy: { id: string; name: string | null; image: string | null };
  categorie: { id: string; nom: string } | null;
};

export type BoutiquePageProps = {
  recettes: RecetteBoutique[];
  categories: CategorieVue[];
};

export default function BoutiquePage({ recettes: initialRecettes, categories: initialCategories }: BoutiquePageProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const router = useRouter();
  const [recettes, setRecettes] = useState<RecetteBoutique[]>(initialRecettes);
  const [categories, setCategories] = useState<CategorieVue[]>(initialCategories);
  const [categorieFiltre, setCategorieFiltre] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tri, setTri] = useState<"validations" | "recent">("validations");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dialogue, setDialogue] = useState<{ type: "partager" | "signaler"; recette: RecetteBoutique; reason?: string; detail?: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const REASONS = ["spam", "inapproprié", "autre"] as const;
  type Reason = (typeof REASONS)[number];
  const REASON_LABELS: Record<Reason, string> = {
    spam: "Spam",
    "inapproprié": "Contenu inapproprié",
    autre: "Autre",
  };

  const filteredRecettes = recettes.filter((r) => {
    if (categorieFiltre && r.categorie?.id !== categorieFiltre) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.title.toLowerCase().includes(s) && !r.tags.some((t) => t.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const sortedRecettes = [...filteredRecettes].sort((a, b) => {
    if (tri === "validations") return b.validationCount - a.validationCount;
    return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
  });

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams({
        page: nextPage.toString(),
        limit: limit.toString(),
      });
      if (categorieFiltre) params.set("categorieId", categorieFiltre);
      if (search) params.set("search", search);
      const res = await fetch(`/api/boutique?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.recipes.length > 0) {
          setRecettes((prev) => [...prev, ...data.recipes]);
          setPage(nextPage);
        } else {
          setHasMore(false);
        }
      }
    } catch {
      // erreur silencieuse
    } finally {
      setLoading(false);
    }
  }

  function ouvrirPartager(r: RecetteBoutique) {
    if (r.createdBy.id === currentUserId) return;
    setDialogue({ type: "partager", recette: r });
  }

  function ouvrirSignaler(r: RecetteBoutique) {
    if (r.createdBy.id === currentUserId) return;
    setDialogue({ type: "signaler", recette: r, reason: "autre" });
  }

  function fermer() {
    setDialogue(null);
    setErreur(null);
  }

  async function partager() {
    if (!dialogue || dialogue.type !== "partager") return;
    const { recette } = dialogue;
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/recipes/${recette.id}/share`, { method: "POST" });
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
    setEnCours(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/recipes/${recette.id}/report`, {
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-miamz-vert">Boutique communautaire</h1>
          <p className="text-sm text-texte-doux">Recettes validées par la communauté — 3 validations = badge ✅</p>
        </div>
      </div>

      {/* Recherche + Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un titre ou un ingrédient…"
          aria-label="Rechercher"
          className="champ w-full sm:flex-1 rounded-full"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={categorieFiltre ?? ""}
            onChange={(e) => setCategorieFiltre(e.target.value || null)}
            aria-label="Filtrer par catégorie"
            className="champ min-h-11 px-3 text-sm"
          >
            <option value="">Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as "validations" | "recent")}
            aria-label="Trier par"
            className="champ min-h-11 px-3 text-sm"
          >
            <option value="validations">Plus validées</option>
            <option value="recent">Plus récentes</option>
          </select>
        </div>
      </div>

      {erreur && <div role="status" className="text-sm text-danger">{erreur}</div>}

      {/* Grille recettes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sortedRecettes.length === 0 ? (
          <div className="col-span-full carte p-10 text-center">
            <div className="text-4xl">🔍</div>
            <p className="mt-3 font-medium text-texte-doux">Aucune recette ne correspond.</p>
            <button type="button" onClick={() => { setSearch(""); setCategorieFiltre(null); }} className="bouton mt-3">
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <>
            {sortedRecettes.map((r) => (
              <article key={r.id} className="carte p-4 flex flex-col">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  {r.validationCount >= 3 && (
                    <span className="badge-validée flex items-center gap-1 rounded-full bg-[#A8E6CF]/20 px-2 py-0.5 text-xs font-medium text-[#2e5340]">
                      ✅ Validée ({r.validationCount}/3+)
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-foreground">{r.title}</h3>
                <p className="mt-1 text-sm text-texte-doux">
                  {r.minutes ? `${r.minutes} min` : "Durée non précisée"}
                  {r.categorie?.nom ? ` · ${r.categorie.nom}` : ""}
                </p>
                <p className="mt-1 text-xs text-texte-tres-doux">par {r.createdBy.name ?? "Anonyme"}</p>
                {r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {r.tags.slice(0, 4).map((t) => (
                      <span key={t} className="puce">{t}</span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => ouvrirPartager(r)}
                    disabled={r.createdBy.id === currentUserId}
                    className="bouton min-h-9 px-3 text-sm flex-1"
                  >
                    Ajouter à mes recettes
                  </button>
                  <button
                    type="button"
                    onClick={() => ouvrirSignaler(r)}
                    disabled={r.createdBy.id === currentUserId}
                    className="bouton-danger min-h-9 px-3 text-sm"
                  >
                    Signaler
                  </button>
                </div>
              </article>
            ))}
            {hasMore && (
              <div className="col-span-full">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loading}
                  className="bouton-secondaire w-full min-h-11"
                >
                  {loading ? "Chargement…" : "Voir plus"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modale Partager */}
      {dialogue?.type === "partager" && (
        <FeuilleModale
          ouvert
          onFermer={() => { fermer(); }}
          titre="Ajouter à mes recettes"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => { setDialogue(null); }} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">Annuler</button>
              <button type="button" onClick={partager} disabled={enCours} className="bouton min-h-11 flex-1">{enCours ? "Ajout…" : "Ajouter à mes recettes"}</button>
            </div>
          }
        >
          <p className="text-sm text-texte-doux">Ajouter « {dialogue.recette.title} » à ta cuisine ? Tu pourras la planifier mais pas la modifier (copie lecture seule).</p>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}

      {/* Modale Signaler */}
      {dialogue?.type === "signaler" && (
        <FeuilleModale
          ouvert
          onFermer={() => { setDialogue(null); }}
          titre="Signaler cette recette"
          footer={
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => { setDialogue(null); }} disabled={enCours} className="bouton-secondaire min-h-11 flex-1">Annuler</button>
              <button type="button" onClick={signaler} disabled={enCours} className="bouton min-h-11 flex-1">{enCours ? "Signalement…" : "Signaler"}</button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium">Raison</label>
            <select value={dialogue.reason} onChange={(e) => setDialogue({ ...dialogue!, reason: e.target.value as "spam" | "inapproprié" | "autre" })} disabled={enCours} className="champ min-h-11 w-full">
              <option value="spam">Spam</option>
              <option value="inapproprié">Contenu inapproprié</option>
              <option value="autre">Autre</option>
            </select>
            <label className="text-sm font-medium">Détail (optionnel)</label>
            <textarea value={dialogue.detail || ""} onChange={(e) => setDialogue({ ...dialogue!, detail: e.target.value })} disabled={enCours} rows={3} className="champ w-full" placeholder="Explications supplémentaires…" />
          </div>
          {erreur && <p className="mt-2 text-sm text-danger">{erreur}</p>}
        </FeuilleModale>
      )}
    </div>
  );
}
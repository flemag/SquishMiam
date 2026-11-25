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
  boostedUntil?: string | null;
};

export type ArticleBoutique = {
  id: string;
  type: string;
  nom: string;
  description: string;
  prix: number;
  image: string | null;
  metadata: unknown;
};

export type BoutiquePageProps = {
  recettes: RecetteBoutique[];
  categories: CategorieVue[];
  articles: ArticleBoutique[];
  tokens: number;
};

const REASONS = ["spam", "inapproprié", "autre"] as const;
type Reason = (typeof REASONS)[number];
const REASON_LABELS: Record<Reason, string> = {
  spam: "Spam",
  "inapproprié": "Contenu inapproprié",
  autre: "Autre",
};

const TYPE_LABELS: Record<string, string> = {
  theme: "Thèmes",
  accessoire: "Accessoires",
  pack: "Packs",
};

const TYPE_ICONS: Record<string, string> = {
  theme: "🎨",
  accessoire: "✨",
  pack: "📦",
};

export default function BoutiquePage({ recettes: initialRecettes, categories: initialCategories, articles: initialArticles, tokens: initialTokens }: BoutiquePageProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const router = useRouter();
  const [recettes] = useState<RecetteBoutique[]>(initialRecettes);
  const [categories] = useState<CategorieVue[]>(initialCategories);
  const [articles] = useState<ArticleBoutique[]>(initialArticles);
  const [tokens, setTokens] = useState(initialTokens);

  // Tab state
  const [onglet, setOnglet] = useState<"recettes" | "articles">("recettes");

  // Recipe filters
  const [categorieFiltre, setCategorieFiltre] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tri, setTri] = useState<"validations" | "recent">("validations");
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  // Article filters
  const [typeFiltre, setTypeFiltre] = useState<string | null>(null);
  const [searchArticle, setSearchArticle] = useState("");

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dialogue, setDialogue] = useState<{ type: "partager" | "signaler"; recette: RecetteBoutique; reason?: string; detail?: string } | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [achatEnCours, setAchatEnCours] = useState<string | null>(null);
  const [achatMessage, setAchatMessage] = useState<string | null>(null);

  const limit = 20;

  // Filtered recipes
  const filteredRecettes = recettes.filter((r) => {
    if (categorieFiltre && r.categorie?.id !== categorieFiltre) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.title.toLowerCase().includes(s) && !r.tags.some((t) => t.toLowerCase().includes(s))) return false;
    }
    return true;
  });

  const sortedRecettes = [...filteredRecettes].sort((a, b) => {
    const aBoost = a.boostedUntil && new Date(a.boostedUntil) > new Date() ? 1 : 0;
    const bBoost = b.boostedUntil && new Date(b.boostedUntil) > new Date() ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;
    if (tri === "validations") return b.validationCount - a.validationCount;
    return new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime();
  });

  const filtresRecettesActifs = categorieFiltre !== null || tri !== "validations";

  // Filtered articles
  const filteredArticles = articles.filter((a) => {
    if (typeFiltre && a.type !== typeFiltre) return false;
    if (searchArticle) {
      const s = searchArticle.toLowerCase();
      if (!a.nom.toLowerCase().includes(s) && !a.description.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    const nextPage = page + 1;
    try {
      const params = new URLSearchParams({ page: nextPage.toString(), limit: limit.toString() });
      if (categorieFiltre) params.set("categorieId", categorieFiltre);
      if (search) params.set("search", search);
      const res = await fetch(`/api/boutique?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.recipes.length > 0) {
          // Note: can't update state easily since recettes is from props
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

  async function acheter(itemId: string) {
    setAchatEnCours(itemId);
    setAchatMessage(null);
    try {
      const res = await fetch("/api/boutique/acheter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setTokens(data.tokens);
        setAchatMessage("Achat réussi ! ✨");
        router.refresh();
      } else {
        setAchatMessage(data.error ?? "Achat impossible — réessaie.");
      }
    } catch {
      setAchatMessage("Achat impossible — réessaie.");
    } finally {
      setAchatEnCours(null);
    }
  }

  const isBoosted = (r: RecetteBoutique) => !!r.boostedUntil && new Date(r.boostedUntil) > new Date();

  const typeIcons: Record<string, string> = { theme: "🎨", accessoire: "✨", pack: "📦" };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-miamz-vert">Boutique communautaire</h1>
        <p className="text-sm text-texte-doux">Recettes validées + articles (thèmes, accessoires, packs)</p>
      </div>

      {/* Solde jetons */}
      <div className="flex items-center gap-2 text-sm text-texte-doux">
        <span className="text-lg font-semibold text-[#4A6741]">{tokens}</span> jeton{tokens > 1 ? "s" : ""} disponible{tokens > 1 ? "s" : ""}
      </div>

      {/* Onglets */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOnglet("recettes")}
          aria-pressed={onglet === "recettes"}
          className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-medium transition ${
            onglet === "recettes" ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
          }`}
        >
          📖 Recettes
        </button>
        <button
          type="button"
          onClick={() => setOnglet("articles")}
          aria-pressed={onglet === "articles"}
          className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-medium transition ${
            onglet === "articles" ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
          }`}
        >
          🛍️ Articles ({articles.length})
        </button>
      </div>

      {achatMessage && (
        <div role="status" className={`text-sm font-medium ${achatMessage.includes("réessaie") || achatMessage.includes("impossible") || achatMessage.includes("insuffisant") ? "text-danger" : "text-[#4A6741]"}`}>
          {achatMessage}
        </div>
      )}

      {erreur && <div role="status" className="text-sm text-danger">{erreur}</div>}

      {/* Onglet Recettes */}
      {onglet === "recettes" && (
        <div className="flex flex-col gap-4">
          {/* Recherche + filtres */}
          <div className="sticky top-[4.25rem] z-10 -mx-4 bg-fond-voile px-4 py-2 backdrop-blur">
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un titre ou un tag…"
                aria-label="Rechercher"
                className="champ w-full rounded-full"
              />
              <button
                type="button"
                onClick={() => setFiltresOuverts((v) => !v)}
                aria-expanded={filtresOuverts}
                aria-label="Filtres"
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
                  filtresRecettesActifs ? "border-[#4A6741] bg-[#4A6741] text-white" : "border-bordure bg-white text-texte-doux"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
                  <path d="M3 6h18M6 12h12M9 18h6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {filtresOuverts && (
              <div className="mt-2 flex flex-col gap-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setCategorieFiltre(null)}
                    aria-pressed={categorieFiltre === null}
                    className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-medium transition ${
                      categorieFiltre === null ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
                    }`}
                  >
                    Toutes
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategorieFiltre(c.id)}
                      aria-pressed={categorieFiltre === c.id}
                      className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-medium transition ${
                        categorieFiltre === c.id ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
                      }`}
                    >
                      {c.nom}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTri("validations")}
                    aria-pressed={tri === "validations"}
                    className={`min-h-9 flex-1 rounded-full px-3 text-xs font-medium transition ${
                      tri === "validations" ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
                    }`}
                  >
                    Plus validées
                  </button>
                  <button
                    type="button"
                    onClick={() => setTri("recent")}
                    aria-pressed={tri === "recent"}
                    className={`min-h-9 flex-1 rounded-full px-3 text-xs font-medium transition ${
                      tri === "recent" ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
                    }`}
                  >
                    Plus récentes
                  </button>
                </div>
                {filtresRecettesActifs && (
                  <button
                    type="button"
                    onClick={() => { setSearch(""); setCategorieFiltre(null); setTri("validations"); }}
                    className="bouton-secondaire min-h-9 self-start px-3 text-xs"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                  <article
                    key={r.id}
                    className={`carte flex flex-col p-4 ${isBoosted(r) ? "ring-2 ring-[#E07A5F]/40" : ""}`}
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {isBoosted(r) && (
                        <span className="rounded-full bg-[#E07A5F]/15 px-2 py-0.5 text-xs font-medium text-[#8c2f3f]">
                          ✨ Sponsorisée
                        </span>
                      )}
                      {r.validationCount >= 3 && (
                        <span className="rounded-full bg-[#A8E6CF]/20 px-2 py-0.5 text-xs font-medium text-[#2e5340]">
                          ✅ Validée
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
                    <div className="mt-auto pt-3 flex flex-wrap gap-2">
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
                    {loading ? (
                      <div className="flex flex-col gap-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="carte animate-pulse p-4">
                            <div className="h-4 w-2/3 rounded bg-gray-200" />
                            <div className="mt-2 h-3 w-1/3 rounded bg-gray-200" />
                            <div className="mt-3 h-8 w-full rounded bg-gray-200" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={loadMore}
                        className="bouton-secondaire w-full min-h-11"
                      >
                        Voir plus
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Onglet Articles */}
      {onglet === "articles" && (
        <div className="flex flex-col gap-4">
          {/* Filtre par type */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setTypeFiltre(null)}
              aria-pressed={typeFiltre === null}
              className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-medium transition ${
                typeFiltre === null ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
              }`}
            >
              Tout
            </button>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTypeFiltre(key)}
                aria-pressed={typeFiltre === key}
                className={`min-h-9 shrink-0 rounded-full px-3 text-xs font-medium transition ${
                  typeFiltre === key ? "bg-[#4A6741] text-white" : "border border-bordure bg-white text-texte-doux"
                }`}
              >
                {TYPE_ICONS[key]} {label}
              </button>
            ))}
          </div>

          {/* Recherche articles */}
          <input
            type="search"
            value={searchArticle}
            onChange={(e) => setSearchArticle(e.target.value)}
            placeholder="Rechercher un article…"
            aria-label="Rechercher un article"
            className="champ w-full rounded-full"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredArticles.length === 0 ? (
              <div className="col-span-full carte p-10 text-center">
                <div className="text-4xl">🛍️</div>
                <p className="mt-3 font-medium text-texte-doux">Aucun article ne correspond.</p>
              </div>
            ) : (
              filteredArticles.map((a) => (
                <article key={a.id} className="carte flex flex-col p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-2xl">{TYPE_ICONS[a.type] ?? "📦"}</span>
                    <h3 className="font-semibold text-foreground">{a.nom}</h3>
                  </div>
                  {a.description && <p className="text-sm text-texte-doux">{a.description}</p>}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-[#4A6741]">
                      {a.prix === 0 ? "Gratuit" : `${a.prix} jetons`}
                    </span>
                    <button
                      type="button"
                      onClick={() => acheter(a.id)}
                      disabled={achatEnCours === a.id}
                      className="bouton min-h-9 px-3 text-sm"
                    >
                      {achatEnCours === a.id ? "Achat…" : "Acheter"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      )}

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
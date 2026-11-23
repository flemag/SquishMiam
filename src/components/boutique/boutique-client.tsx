"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import type { CategorieVue } from "@/lib/categories";
import BoutiquePage, { type RecetteBoutique, type BoutiquePageProps } from "./boutique-page";

export default function BoutiqueClient({ recettes: initialRecettes, categories: initialCategories }: BoutiquePageProps) {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const [recettes, setRecettes] = useState<RecetteBoutique[]>(initialRecettes);
  const [categories, setCategories] = useState<CategorieVue[]>(initialCategories);
  const [categorieFiltre, setCategorieFiltre] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tri, setTri] = useState<"validations" | "recent">("validations");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  // Charger les catégories au montage
  useEffect(() => {
    // Les catégories sont déjà passées en props initiales
  }, []);

  const filteredRecettes = recettes.filter((r) => {
    if (categorieFiltre && r.categorie?.id !== categorieFiltre) return false;
    return true;
  });

  const sortedRecettes = [...filteredRecettes].sort((a, b) => {
    // Tri par validations par défaut
    return b.validationCount - a.validationCount;
  });

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
        </div>
      </div>

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
              </article>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
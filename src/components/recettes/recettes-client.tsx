"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  filtrerRecettes,
  nomsIngredients,
  trierRecettes,
  type RecetteRecherchable,
  type Tri,
} from "@/lib/recherche-recettes";
import type { CategorieVue } from "@/lib/categories";
import RecetteCard from "./recette-card";
import FeuilleRecette, { type RecetteFiche } from "./feuille-recette";

export type RecetteVue = RecetteFiche;
type VueRechercheable = RecetteVue & RecetteRecherchable;

const DUREES: { label: string; valeur: number | null }[] = [
  { label: "Toutes durées", valeur: null },
  { label: "≤ 20 min", valeur: 20 },
  { label: "≤ 30 min", valeur: 30 },
  { label: "≤ 45 min", valeur: 45 },
];

const TRIS: { label: string; valeur: Tri }[] = [
  { label: "Récent", valeur: "recent" },
  { label: "A → Z", valeur: "alpha" },
  { label: "Durée", valeur: "duree" },
];

/**
 * Onglet Recettes côté client : recherche instantanée (titres + ingrédients),
 * filtres tags cumulables + durée, tri, et fiche en bottom sheet. La logique
 * vit dans l'utilitaire pur recherche-recettes (testé).
 */
export default function RecettesClient({
  recettes,
  categories,
  recetteInitialeId = null,
}: {
  recettes: RecetteVue[];
  categories: CategorieVue[];
  recetteInitialeId?: string | null;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id ?? "";
  const [requete, setRequete] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState<string | null>(null);
  const [tagsChoisis, setTagsChoisis] = useState<string[]>([]);
  const [dureeMax, setDureeMax] = useState<number | null>(null);
  const [tri, setTri] = useState<Tri>("recent");
  const [recetteOuverte, setRecetteOuverte] = useState<RecetteVue | null>(null);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

  // Lien direct depuis Miamz : /recettes?recette=<id> ouvre la fiche demandée.
  useEffect(() => {
    if (!recetteInitialeId) return;
    const trouvee = recettes.find((r) => r.id === recetteInitialeId);
    if (trouvee) setRecetteOuverte(trouvee);
  }, [recetteInitialeId, recettes]);

  function fermerRecette() {
    setRecetteOuverte(null);
    if (recetteInitialeId) router.replace("/recettes");
  }

  // Compter la fréquence de chaque tag
  const tagCounts = new Map<string, number>();
  for (const r of recettes) {
    for (const t of r.tags) {
      tagCounts.set(t, (tagCounts.get(t) || 0) + 1);
    }
  }

  // Seuil : afficher les tags utilisés au moins 2 fois par défaut
  const [afficherRares, setAfficherRares] = useState(false);
  const seuil = afficherRares ? 1 : 2;
  const tagsTous = [...tagCounts.entries()]
    .filter(([, count]) => count >= seuil)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .map(([tag]) => tag);

  const recettesRecherchables: VueRechercheable[] = recettes.map((r) => ({
    ...r,
    ingredientNoms: nomsIngredients(r.ingredients),
  }));
  const visibles = trierRecettes(
    filtrerRecettes(recettesRecherchables, {
      requete,
      tags: tagsChoisis,
      dureeMax,
      categorieId: categorieFiltre,
    }),
    tri
  );

  function basculeTag(tag: string) {
    setTagsChoisis((choisis) =>
      choisis.includes(tag) ? choisis.filter((t) => t !== tag) : [...choisis, tag]
    );
  }

  function reinitialiser() {
    setRequete("");
    setCategorieFiltre(null);
    setTagsChoisis([]);
    setDureeMax(null);
    setTri("recent");
  }

  const filtresActifs =
    categorieFiltre !== null || tagsChoisis.length > 0 || dureeMax !== null || tri !== "recent";

  return (
    <div className="flex flex-col gap-3">
      {/* Barre de recherche sticky */}
      <div className="sticky top-[4.25rem] z-10 -mx-4 bg-fond-voile px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <input
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            type="search"
            placeholder="Rechercher un titre ou un ingrédient…"
            aria-label="Rechercher un titre ou un ingrédient"
            className="champ w-full rounded-full"
          />
          <button
            type="button"
            onClick={() => setFiltresOuverts((v) => !v)}
            aria-expanded={filtresOuverts}
            aria-label="Filtres"
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
              filtresActifs
                ? "border-[#4A6741] bg-[#4A6741] text-white"
                : "border-bordure bg-white text-texte-doux"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
              <path d="M3 6h18M6 12h12M9 18h6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Panneau de filtres (repliable) */}
      {filtresOuverts && (
        <div className="carte flex flex-col gap-3 p-4">
          {/* Catégories — scroll horizontal */}
          <div
            role="group"
            aria-label="Filtrer par catégorie"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            <button
              type="button"
              onClick={() => setCategorieFiltre(null)}
              aria-pressed={categorieFiltre === null}
              className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-medium transition ${
                categorieFiltre === null
                  ? "bg-[#4A6741] text-white"
                  : "border border-bordure bg-white text-texte-doux"
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
                className={`min-h-9 shrink-0 rounded-full px-4 text-sm font-medium transition ${
                  categorieFiltre === c.id
                    ? "bg-[#4A6741] text-white"
                    : "border border-bordure bg-white text-texte-doux"
                }`}
              >
                {c.nom}
              </button>
            ))}
          </div>

          {/* Durées — chips */}
          <div className="flex flex-wrap gap-2">
            {DUREES.map((d) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setDureeMax(d.valeur)}
                aria-pressed={dureeMax === d.valeur}
                className={`min-h-9 rounded-full px-3 text-sm font-medium transition ${
                  dureeMax === d.valeur
                    ? "bg-[#4A6741] text-white"
                    : "border border-bordure bg-white text-texte-doux"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          {/* Tags — scroll horizontal */}
          {tagsTous.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {tagsTous.map((t) => {
                const count = tagCounts.get(t) || 0;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => basculeTag(t)}
                    aria-pressed={tagsChoisis.includes(t)}
                    title={`${count} recette${count > 1 ? "s" : ""}`}
                    className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-medium transition ${
                      tagsChoisis.includes(t)
                        ? "bg-[#4A6741] text-white"
                        : "border border-bordure bg-white text-texte-doux"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setAfficherRares((v) => !v)}
                aria-pressed={afficherRares}
                className="min-h-9 shrink-0 rounded-full px-3 text-sm font-medium transition border border-bordure bg-white text-texte-doux hover:bg-[#A8E6CF]/30"
              >
                {afficherRares ? "Masquer rares" : "Voir rares"}
              </button>
            </div>
          )}

          {/* Tri */}
          <div className="flex gap-2">
            {TRIS.map((t) => (
              <button
                key={t.valeur}
                type="button"
                onClick={() => setTri(t.valeur)}
                aria-pressed={tri === t.valeur}
                className={`min-h-9 flex-1 rounded-full px-3 text-sm font-medium transition ${
                  tri === t.valeur
                    ? "bg-[#4A6741] text-white"
                    : "border border-bordure bg-white text-texte-doux"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {filtresActifs && (
            <button
              type="button"
              onClick={reinitialiser}
              className="bouton-secondaire min-h-9 self-start px-3 text-xs"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}

      {/* Compteur */}
      <p className="text-sm text-texte-doux">
        {visibles.length} recette{visibles.length > 1 ? "s" : ""} trouvée{visibles.length > 1 ? "s" : ""}
      </p>

      {/* Grille — 1 colonne mobile, 2 tablette, 3 desktop */}
      {visibles.length === 0 ? (
        <div className="carte p-10 text-center">
          <div className="text-4xl">🔍</div>
          <p className="mt-3 font-medium text-texte-doux">Aucune recette ne correspond.</p>
          <button type="button" onClick={reinitialiser} className="bouton mt-3">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((r) => (
            <RecetteCard key={r.id} recette={r} onOuvrir={() => setRecetteOuverte(r)} currentUserId={currentUserId} />
          ))}
        </div>
      )}

      <FeuilleRecette recette={recetteOuverte} onFermer={fermerRecette} />
    </div>
  );
}
"use client";

import { useState } from "react";
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
  { label: "Toutes", valeur: null },
  { label: "≤ 20 min", valeur: 20 },
  { label: "≤ 30 min", valeur: 30 },
  { label: "≤ 45 min", valeur: 45 },
];

/**
 * Onglet Recettes côté client : recherche instantanée (titres + ingrédients),
 * filtres tags cumulables + durée, tri, et fiche en bottom sheet. La logique
 * vit dans l'utilitaire pur recherche-recettes (testé).
 */
export default function RecettesClient({
  recettes,
  categories,
}: {
  recettes: RecetteVue[];
  categories: CategorieVue[];
}) {
  const [requete, setRequete] = useState("");
  const [categorieFiltre, setCategorieFiltre] = useState<string | null>(null);
  const [tagsChoisis, setTagsChoisis] = useState<string[]>([]);
  const [dureeMax, setDureeMax] = useState<number | null>(null);
  const [tri, setTri] = useState<Tri>("recent");
  const [recetteOuverte, setRecetteOuverte] = useState<VueRechercheable | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-[4.25rem] z-10 -mx-4 bg-fond-voile px-4 py-2 backdrop-blur">
        <input
          value={requete}
          onChange={(e) => setRequete(e.target.value)}
          type="search"
          placeholder="Rechercher un titre ou un ingrédient…"
          aria-label="Rechercher un titre ou un ingrédient"
          className="champ w-full rounded-full"
        />
      </div>

      {/* Rangée catégories */}
      <div
        role="group"
        aria-label="Filtrer par catégorie"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        <button
          type="button"
          onClick={() => setCategorieFiltre(null)}
          aria-pressed={categorieFiltre === null}
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition ${
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
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition ${
              categorieFiltre === c.id
                ? "bg-[#4A6741] text-white"
                : "border border-bordure bg-white text-texte-doux"
            }`}
          >
            {c.nom}
          </button>
        ))}
      </div>

      {tagsTous.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tagsTous.map((t) => {
            const count = tagCounts.get(t) || 0;
            return (
              <button
                key={t}
                type="button"
                onClick={() => basculeTag(t)}
                aria-pressed={tagsChoisis.includes(t)}
                title={`${count} recette${count > 1 ? "s" : ""}`}
                className={`min-h-9 rounded-full px-3 text-sm font-medium transition ${
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
            className="min-h-9 rounded-full px-3 text-sm font-medium transition border border-bordure bg-white text-texte-doux hover:bg-[#A8E6CF]/30"
            title={afficherRares ? "Masquer les tags rares (1 recette)" : "Afficher les tags rares (1 recette)"}
          >
            {afficherRares ? "Masquer rares" : "Voir rares"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <select
          value={tri}
          onChange={(e) => setTri(e.target.value as Tri)}
          aria-label="Trier les recettes"
          className="champ min-h-9 px-2 text-sm"
        >
          <option value="recent">Récent</option>
          <option value="alpha">A → Z</option>
          <option value="duree">Durée</option>
        </select>
      </div>

      <p className="text-sm text-texte-doux">{visibles.length} recette(s) trouvée(s)</p>

      {visibles.length === 0 ? (
        <div className="carte p-10 text-center">
          <div className="text-4xl">🔍</div>
          <p className="mt-3 font-medium text-texte-doux">Aucune recette ne correspond.</p>
          <button type="button" onClick={reinitialiser} className="bouton mt-3">
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((r) => (
            <RecetteCard key={r.id} recette={r} onOuvrir={() => setRecetteOuverte(r)} />
          ))}
        </div>
      )}

      <FeuilleRecette recette={recetteOuverte} onFermer={() => setRecetteOuverte(null)} />
    </div>
  );
}

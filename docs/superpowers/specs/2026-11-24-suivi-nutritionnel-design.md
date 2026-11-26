# Suivi nutritionnel — design

Date : 2026-11-24
Statut : proposé (en attente d'approbation)

## Intention

Suivre les calories et macros (protéines, glucides, lipides) par recette, par jour
et par semaine. Les valeurs sont calculées automatiquement via Open Food Facts
(base nutritionnelle gratuite) lors de la création/import, et modifiables manuellement.

## Objectifs

- Champs nutrition sur Recipe : `calories`, `proteines`, `glucides`, `lipides` (par portion, nullable).
- Lookup Open Food Facts par ingrédient (nom + quantité) → agrégation par recette.
- API `POST /api/recipes/nutrition` : calcul automatique depuis les ingrédients.
- Saisie manuelle dans le formulaire de recette.
- Affichage nutritionnel sur la fiche recette (carte compacte).
- Dashboard nutritionnel sur la page Plan (totaux par jour et par semaine).
- Objectifs nutritionnels basés sur le profil (calories cible selon objectif).
- Mobile 360 px, cibles ≥ 44 px, zéro nouvelle dépendance.

## Non-objectifs

- Pas de suivi micronutriments (fibres, sodium, etc.) en v1.
- Pas de scan de code-barres.
- Pas de journal alimentaire séparé (les repas planifiés = le journal).
- Pas d'intégration avec des apps tierces (Apple Health, etc.).

## Design

### Schéma Prisma

Ajouter à Recipe : `calories Int?`, `proteines Float?`, `glucides Float?`, `lipides Float?` (par portion).

### Logique pure — `src/lib/nutrition.ts` (TDD)

- `normaliserNomIngredient(nom: string): string` — minuscules, sans accents.
- `calculerNutritionRecette(ingredients: {nom, quantite?, unite?}[], lookup: (nom) => NutriPar100g | null): NutritionRecette | null`
- `agregerSemaine(entries: {servings, nutrition}[]): NutritionJour[]`
- `objectifCalorique(goal: string, householdSize: number): number` — calories cible par jour selon l'objectif.

### Lookup Open Food Facts

- `chercherNutrition(nom: string): Promise<NutriPar100g | null>` dans `src/lib/openfoodfacts.ts`.
- Endpoint : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=...&json=1&page_size=3`
- Retourne : `{ calories, proteines, glucides, lipides }` pour 100g.
- Conversion : quantité en g (approximation pour les unités non-g).

### API — `POST /api/recipes/nutrition`

- Corps `{ ingredients: [{ nom, quantite?, unite? }] }`.
- Charge les données nutrition pour chaque ingrédient.
- Agrège et retourne `{ calories, proteines, glucides, lipides }` (par portion, pour 1 portion).
- Timeout 10 s global.

### API — `PATCH /api/recipes/[id]` (existant)

- Accepter les champs nutrition dans le body (mise à jour manuelle).

### UI — Fiche recette

- Carte nutrition compacte : « 320 kcal · P 12g · G 40g · L 12g » par portion.
- Bouton « Calculer la nutrition » (appel API) + édition manuelle.

### UI — Formulaire recette

- Champs optionnels : calories, protéines, glucides, lipides (par portion).
- Bouton « Calculer automatiquement » depuis les ingrédients.

### UI — Page Plan

- Totaux nutritionnels par jour (colonne ou tooltip).
- Résumé de la semaine : total calories, macros moyens par jour.
- Indicateur vs objectif (barre de progression).

### Coût / garde-fous

Un appel par ingrédient (max 10), 10 s global. Cache possible côté client.
Aucune dépendance npm (fetch natif).

## Ce qui reste au bâtisseur

Libellés exacts, seuils d'objectif calorique, affichage détaillé (graphique ou chiffres).

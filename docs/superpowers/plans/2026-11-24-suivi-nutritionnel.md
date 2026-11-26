# Suivi nutritionnel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suivre calories et macros (P/G/L) par recette, par jour et par semaine, via Open Food Facts + saisie manuelle.

**Architecture:** Migration Prisma (champs nutrition sur Recipe) → logique pure testée (nutrition.ts) → lookup Open Food Facts (openfoodfacts.ts) → API calcul → UI fiche recette + formulaire + dashboard plan.

**Tech Stack:** Next.js 15 (App Router), Prisma, Open Food Facts API (gratuite), Vitest, Tailwind. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-24-suivi-nutritionnel-design.md`

## Global Constraints

- UI française, tutoiement.
- Mobile 360 px sans débordement ; cibles tactiles ≥ 44 px (`min-h-11`).
- Aucune nouvelle dépendance npm ; migration additive uniquement.
- `npm test` et `npm run build` verts avant chaque commit.
- Git hors PATH : `"C:\Program Files\Git\cmd\git.exe"`.

## Review Focus

- **Recette sans ingrédients** : pas de crash, nutrition null.
- **Ingrédient introuvable dans Open Food Facts** : ignoré, pas de crash.
- **Quantités en unités non-g (pièce, boîte)** : approximation raisonnable.
- **Objectif perte de poids** : calories cible plus basse.
- **Utilisateur sans profil** : valeurs par défaut.

---

### Task 1: Migration + logique pure

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/nutrition.ts`
- Test: `tests/nutrition.test.ts`

**Interfaces:**
- Produces:
  - `type NutritionPar100g = { calories: number; proteines: number; glucides: number; lipides: number }`
  - `type NutritionRecette = { calories: number; proteines: number; glucides: number; lipides: number }`
  - `type NutritionJour = { date: string; calories: number; proteines: number; glucides: number; lipides: number }`
  - `normaliserNomIngredient(nom: string): string`
  - `calculerNutritionRecette(ingredients: { nom: string; quantite?: number; unite?: string }[], lookup: (nom: string) => NutritionPar100g | null): NutritionRecette | null`
  - `agregerSemaine(entries: { date: string; servings: number; nutrition: NutritionRecette | null }[]): NutritionJour[]`
  - `objectifCalorique(goal: string): number`

- [ ] **Step 1: Add schema fields** — `calories Int?`, `proteines Float?`, `glucides Float?`, `lipides Float?` sur Recipe.

- [ ] **Step 2: Create migration** — `npx prisma migrate dev --name add_nutrition`.

- [ ] **Step 3: Write tests + implement pure logic**

`normaliserNomIngredient` : minuscules, sans accents, trim.

`calculerNutritionRecette` : pour chaque ingrédient, lookup(nom) → si null, skip. Convertir quantité en grammes (g=1, kg=1000, ml≈g, cl=10, l=1000, pièce≈100g, boîte≈200g, défaut 100g si pas de quantité). Agréger calories/protéines/glucides/lipides. Diviser par le nombre de portions (servings par défaut 1). Arrondir.

`agregerSemaine` : grouper par date, sommer les macros × servings.

`objectifCalorique` : equilibre=2000, perte_poids=1600, prise_masse=2500, sante=1800, famille=2000.

- [ ] **Step 4: Run tests** — `npx vitest run tests/nutrition.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add prisma/schema.prisma prisma/migrations src/lib/nutrition.ts tests/nutrition.test.ts; git commit -m "feat: add nutrition schema and pure logic"`.

---

### Task 2: Lookup Open Food Facts

**Files:**
- Create: `src/lib/openfoodfacts.ts`

**Interfaces:**
- Produces: `chercherNutrition(nom: string): Promise<NutritionPar100g | null>`

- [ ] **Step 1: Implement Open Food Facts lookup**

Endpoint : `https://world.openfoodfacts.org/cgi/search.pl?search_terms=...&json=1&page_size=3&fields=nutriments`.
Parser : calories (kcal_100g), proteines (proteins_100g), glucides (carbohydrates_100g), lipides (fat_100g).
Timeout 5 s. Si pas de résultat ou erreur → null.
Normaliser le nom avant la recherche.

- [ ] **Step 2: Commit** — `git add src/lib/openfoodfacts.ts; git commit -m "feat: add Open Food Facts nutrition lookup"`.

---

### Task 3: API calcul nutrition

**Files:**
- Create: `src/app/api/recipes/nutrition/route.ts`

**Interfaces:**
- Produces: `POST /api/recipes/nutrition` → `{ calories, proteines, glucides, lipides }`.

- [ ] **Step 1: Implement the route**

Auth check. Body `{ ingredients: [{ nom, quantite?, unite? }] }`. Pour chaque ingrédient, appeler `chercherNutrition`. Agréger avec `calculerNutritionRecette`. Retourner les valeurs par portion.

- [ ] **Step 2: Verify build** — `npm run build` → vert.

- [ ] **Step 3: Commit** — `git add src/app/api/recipes/nutrition/route.ts; git commit -m "feat: add nutrition calculation API"`.

---

### Task 4: Formulaire recette (saisie + calcul auto)

**Files:**
- Modify: `src/components/recettes/formulaire-recette.tsx`

**Interfaces:**
- Consumes: `POST /api/recipes/nutrition`.

- [ ] **Step 1: Add nutrition fields**

Ajouter 4 champs (calories, protéines, glucides, lipides) dans le formulaire, sous les ingrédients. Bouton « Calculer automatiquement » qui appelle l'API et remplit les champs.

- [ ] **Step 2: Verify build** — `npm run build` → vert.

- [ ] **Step 3: Commit** — `git add src/components/recettes/formulaire-recette.tsx; git commit -m "feat: add nutrition fields and auto-calc to recipe form"`.

---

### Task 5: Fiche recette (affichage nutrition)

**Files:**
- Modify: `src/components/recettes/feuille-recette.tsx`

**Interfaces:**
- Consumes: `RecetteFiche` (ajouter champs nutrition).

- [ ] **Step 1: Add nutrition card**

Carte compacte sous les tags : « 320 kcal · P 12g · G 40g · L 12g » par portion. Si pas de données : « Pas encore calculé ».

- [ ] **Step 2: Verify build** — `npm run build` → vert.

- [ ] **Step 3: Commit** — `git add src/components/recettes/feuille-recette.tsx; git commit -m "feat: display nutrition on recipe sheet"`.

---

### Task 6: Dashboard nutrition sur la page Plan

**Files:**
- Create: `src/components/plan/nutrition-dashboard.tsx`
- Modify: `src/app/(app)/plan/page.tsx`

**Interfaces:**
- Consumes: `agregerSemaine`, `objectifCalorique` de `@/lib/nutrition`.

- [ ] **Step 1: Implement dashboard**

Composant qui affiche : totaux par jour (calories, macros), résumé semaine (moyenne par jour), barre vs objectif calorique.

- [ ] **Step 2: Wire into plan page**

Charger les entries avec nutrition, passer au dashboard. Afficher sous la grille.

- [ ] **Step 3: Verify build and tests** — `npm test` puis `npm run build` → verts.

- [ ] **Step 4: Commit** — `git add src/components/plan/nutrition-dashboard.tsx src/app/(app)/plan/page.tsx; git commit -m "feat: add nutrition dashboard on plan page"`.

---

### Task 7: Gate final et déploiement

- [ ] **Step 1: Full suite** — `npm test` → verts.
- [ ] **Step 2: Production build** — `npm run build` → vert.
- [ ] **Step 3: Scope check** — `git diff --stat` → uniquement les fichiers des tâches 1-6.
- [ ] **Step 4: Push** — `git push origin main`.
- [ ] **Step 5: Ledger** — mettre à jour le progress.md.

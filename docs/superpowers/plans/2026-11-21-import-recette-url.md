# Import de recettes par URL — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre d'importer une recette depuis une URL web (Marmiton, 750g, CuisineAZ, blogs) et de pré-remplir le formulaire de `/recettes/nouvelle` en un clic.

**Architecture:** 
1. Logique pure d'extraction JSON-LD `schema.org/Recipe` (zéro token, instantané).
2. Fallback IA OpenRouter serveur si absence de métadonnées structurées.
3. Route API dédiée `POST /api/recipes/import-url` protégée et sécurisée contre le SSRF.
4. Volet interactif d'import dans `FormulaireRecette`.

**Tech Stack:** Next.js 15, TypeScript, Tailwind v4, Vitest, OpenRouter API (gratuit, serveur uniquement). Zéro nouvelle dépendance npm.

**Spec:** `docs/superpowers/specs/2026-11-21-import-recette-url-design.md`

## Global Constraints

- Zéro nouvelle dépendance npm.
- TDD sur la logique pure d'extraction et de parsing.
- `npm test` ET `npm run build` verts avant chaque commit.
- Mobile 360 px : cibles ≥ 44 px, aucun débordement horizontal, polices rondes / Fredoka.
- Sécurité SSRF stricte sur le fetch d'URLs externes.

---

### Task 1: Logique pure d'extraction et parsing (TDD)

**Files:**
- Create: `src/lib/import-recette.ts`
- Test: `tests/import-recette.test.ts`

**Interfaces:**
```ts
export type RecetteExtraite = {
  title: string;
  servings: number;
  minutes?: number;
  tags: string[];
  ingredients: { nom: string; quantite?: number; unite?: string }[];
  steps: string[];
};

export function parseDureeIso(valeur: string): number | null;
export function parseServings(valeur: unknown): number;
export function parseLigneIngredient(texte: string): { nom: string; quantite?: number; unite?: string };
export function extraireJsonLdRecipe(html: string): RecetteExtraite | null;
export function estUrlSecurisee(urlStr: string): boolean;
```

- [x] **Step 1: Écrire les tests unitaires**
- [x] **Step 2: Vérifier l'échec (RED)**
- [x] **Step 3: Implémenter `src/lib/import-recette.ts`**
- [x] **Step 4: Vérifier le passage des tests (GREEN)**
- [x] **Step 5: Gate `npm test` et commit**

---

### Task 2: Service OpenRouter de secours (Fallback IA)

**Files:**
- Create: `src/lib/openrouter.ts`

**Interfaces:**
```ts
export async function extraireRecetteParIa(texteHtml: string): Promise<RecetteExtraite | null>;
```

- [x] **Step 1: Implémenter l'appel OpenRouter avec prompt JSON structuré et extraction épurée**
- [x] **Step 2: Gestion des timeouts (8s) et mode dégradé gracieux si absence de clé ou erreur réseau**
- [x] **Step 3: Vérifier le typage et le build**

---

### Task 3: Route API `POST /api/recipes/import-url`

**Files:**
- Create: `src/app/api/recipes/import-url/route.ts`

- [x] **Step 1: Authentification de session utilisateur**
- [x] **Step 2: Validation de l'URL (`estUrlSecurisee`) et fetch sécurisé avec timeout de 8s**
- [x] **Step 3: Extraction Niveau 1 (JSON-LD) puis Niveau 2 (OpenRouter si nécessaire)**
- [x] **Step 4: Retour JSON formaté ou erreurs 400/422/504 explicites en français**
- [x] **Step 5: Gate `npm test` + `npm run build` et commit**

---

### Task 4: Interface utilisateur dans `FormulaireRecette`

**Files:**
- Modify: `src/components/recettes/formulaire-recette.tsx`

- [x] **Step 1: Ajouter un volet repliable « Importer depuis un lien » en haut du formulaire**
- [x] **Step 2: Champ URL avec bouton « Importer » et état d'attente animé (« Analyse en cours… »)**
- [x] **Step 3: Pré-remplissage des états du formulaire avec les données extraites**
- [x] **Step 4: Gestion des erreurs avec messages utilisateur clairs**
- [x] **Step 5: Gate `npm test` + `npm run build` et commit**

---

### Task 5: Vérification complète, E2E et Déploiement

- [x] **Step 1: Exécuter la suite complète de tests**
- [x] **Step 2: Build de production Next.js**
- [x] **Step 3: Pousser sur `origin/main` (Vercel)**

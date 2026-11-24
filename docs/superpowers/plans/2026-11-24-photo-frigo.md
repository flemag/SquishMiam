# Photo frigo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importer une photo de frigo → IA vision identifie les ingrédients → propose les recettes existantes qui matchent + un brouillon de nouvelle recette.

**Architecture:** Logique pure testée (`photo-frigo.ts`) → fonction vision dans `openrouter.ts` (modèles gratuits avec vision, fallback) → route `POST /api/recipes/photo-frigo` → composant client `PhotoFrigo` sur la page recettes.

**Tech Stack:** Next.js 15 (App Router), OpenRouter (modèles vision gratuits), Vitest, Tailwind. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-24-photo-frigo-design.md`

## Global Constraints

- UI française, tutoiement.
- Mobile 360 px sans débordement ; cibles tactiles ≥ 44 px (`min-h-11`).
- Tout clic qui attend affiche un retour visuel.
- Aucune nouvelle dépendance npm ; pas de migration Prisma.
- Un seul appel vision par clic, `timeoutMs: 15000`, `maxTokens: 1200`, aucun retry, aucun cache.
- Image compressée côté client (max 800 px, JPEG 0,7).
- `npm test` et `npm run build` verts avant chaque commit.
- Git hors PATH : `"C:\Program Files\Git\cmd\git.exe"`.

## Review Focus

- **IA indisponible / quota épuisé** : message doux + « Réessayer », jamais d'écran cassé.
- **Réponse IA malformée** (JSON cassé, ingrédients vides) → repli propre.
- **Image trop grande** : compression client + limite serveur 2 Mo.
- **Aucune recette ne matche** : afficher quand même les ingrédients détectés + le brouillon.
- **Modèle vision qui ne supporte pas l'image** : essayer le suivant, ne pas planter.

---

### Task 1: Logique pure photo frigo

**Files:**
- Create: `src/lib/photo-frigo.ts`
- Test: `tests/photo-frigo.test.ts`

**Interfaces:**
- Consumes: `RecetteExtraite` de `@/lib/import-recette`.
- Produces:
  - `normaliserIngredient(nom: string): string`
  - `extraireIngredients(contenu: string): string[]`
  - `matcherRecettes(ingredients: string[], recettes: { id: string; title: string; ingredients: { nom: string }[] }[]): { id: string; title: string; score: number; matches: string[] }[]`
  - `parserPhotoFrigo(contenu: string): { ingredients: string[]; brouillon?: RecetteExtraite } | null`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import { normaliserIngredient, extraireIngredients, matcherRecettes, parserPhotoFrigo } from "@/lib/photo-frigo";

describe("normaliserIngredient", () => {
  it("minuscule, sans accents, sans articles", () => {
    expect(normaliserIngredient("  Courgettes  ")).toBe("courgette");
    expect(normaliserIngredient("les œufs")).toBe("oeuf");
    expect(normaliserIngredient("de la farine")).toBe("farine");
  });
});

describe("extraireIngredients", () => {
  it("parse un JSON valide", () => {
    expect(extraireIngredients('{"ingredients":["courgettes","fromage","oeufs"]}')).toEqual(["courgettes", "fromage", "oeufs"]);
  });
  it("parse une liste texte", () => {
    expect(extraireIngredients("courgettes, fromage, œufs")).toEqual(["courgettes", "fromage", "oeufs"]);
  });
  it("renvoie [] pour du vide", () => {
    expect(extraireIngredients("")).toEqual([]);
    expect(extraireIngredients("null")).toEqual([]);
  });
});

describe("matcherRecettes", () => {
  const recettes = [
    { id: "1", title: "Gratin de courgettes", ingredients: [{ nom: "courgettes" }, { nom: "fromage" }, { nom: "oeufs" }] },
    { id: "2", title: "Pâtes au pesto", ingredients: [{ nom: "pâtes" }, { nom: "pesto" }] },
  ];
  it("trouve les recettes qui matchent", () => {
    const r = matcherRecettes(["courgettes", "fromage", "oeufs", "lait"], recettes);
    expect(r[0].id).toBe("1");
    expect(r[0].score).toBe(1); // 3/3
    expect(r[0].matches).toContain("courgettes");
  });
  it("ne propose pas les recettes sans match", () => {
    const r = matcherRecettes(["courgettes", "fromage", "oeufs", "lait"], recettes);
    expect(r.find((x) => x.id === "2")).toBeUndefined();
  });
  it("trie par score décroissant", () => {
    const r = matcherRecettes(["courgettes", "fromage", "pâtes"], recettes);
    expect(r.length).toBe(2);
    expect(r[0].score).toBeGreaterThanOrEqual(r[1].score);
  });
});

describe("parserPhotoFrigo", () => {
  it("parse une réponse complète", () => {
    const r = parserPhotoFrigo(JSON.stringify({
      ingredients: ["courgettes", "fromage"],
      brouillon: { title: "Gratin", servings: 2, ingredients: [{ nom: "courgettes" }], steps: ["Cuire."] },
    }));
    expect(r?.ingredients).toEqual(["courgettes", "fromage"]);
    expect(r?.brouillon?.title).toBe("Gratin");
  });
  it("renvoie null si inexploitable", () => {
    expect(parserPhotoFrigo("pas du json")).toBeNull();
    expect(parserPhotoFrigo('{"ingredients":[]}')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run tests/photo-frigo.test.ts` → FAIL module introuvable.

- [ ] **Step 3: Implement `src/lib/photo-frigo.ts`**

`normaliserIngredient` : trim, toLowerCase, NFD normalize + remove diacritics, remove leading articles (le/la/les/de/du/des/un/une), trim, singularize (remove trailing 's' if > 3 chars).

`extraireIngredients` : try JSON.parse (look for `ingredients` array), else split by comma/newline and clean.

`matcherRecettes` : for each recipe, count how many recipe ingredients match an identified ingredient (normalized contains), score = matches/total, filter score > 0, sort by score desc then title.

`parserPhotoFrigo` : strip fences, JSON.parse, require `ingredients` non-empty array, parse `brouillon` via `parserRecetteGeneree` if present.

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run tests/photo-frigo.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add src/lib/photo-frigo.ts tests/photo-frigo.test.ts; git commit -m "feat: add pure photo-frigo logic"`.

---

### Task 2: Fonction vision OpenRouter

**Files:**
- Modify: `src/lib/openrouter.ts`

**Interfaces:**
- Produces: `MODELES_VISION: string[]`, `demanderReponseVision(messages, imageBase64, options): Promise<string | null>`

- [ ] **Step 1: Add vision models and function**

Add `MODELES_VISION` list (free vision models). Add `demanderReponseVision` that sends messages with image in OpenAI format (`content: [{ type: "text", text }, { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }]`), tries each model, timeout 15s.

- [ ] **Step 2: Commit** — `git add src/lib/openrouter.ts; git commit -m "feat: add vision model support to OpenRouter"`.

---

### Task 3: Route API photo frigo

**Files:**
- Create: `src/app/api/recipes/photo-frigo/route.ts`

**Interfaces:**
- Consumes: `parserPhotoFrigo`, `matcherRecettes` de `@/lib/photo-frigo`; `demanderReponseVision` ; `phraseProfil`.
- Produces: `POST /api/recipes/photo-frigo` → `{ ingredients, recettesMatchees, brouillon }`.

- [ ] **Step 1: Implement the route**

- 401 non authentifié.
- Body `{ image: string }` (data URL). 400 si manquant ou > 2 Mo.
- Charge les recettes de l'utilisateur (id, title, ingredients).
- Prompt système : « Tu es Miamz, chef kawaii. Analyse cette photo de frigo. Identifie les ingrédients visibles. Réponds en JSON strict : { "ingredients": [...], "brouillon": { "title", "servings", "minutes", "tags", "ingredients": [{nom, quantite, unite}], "steps" } }. Le brouillon est optionnel (null si pas assez d'ingrédients). »
- `demanderReponseVision` avec maxTokens 1200, temperature 0.5, timeoutMs 15000.
- Parse avec `parserPhotoFrigo`. Si null → 422 « Miamz n'a pas réussi à lire ton frigo — réessaie. »
- Matche les recettes avec `matcherRecettes`.
- Réponse `{ ingredients, recettesMatchees, brouillon }`.

- [ ] **Step 2: Verify the build** — `npm run build` → vert, route listée.

- [ ] **Step 3: Commit** — `git add src/app/api/recipes/photo-frigo/route.ts; git commit -m "feat: add photo-frigo API route"`.

---

### Task 4: Composant UI + intégration

**Files:**
- Create: `src/components/recettes/photo-frigo.tsx`
- Modify: `src/app/(app)/recettes/page.tsx` (passer les recettes au composant)

**Interfaces:**
- Consumes: `POST /api/recipes/photo-frigo`.
- Produces: `export default function PhotoFrigo({ recettes, onBrouillon }: { recettes: RecetteVue[]; onBrouillon: (r: RecetteExtraite) => void })`.

- [ ] **Step 1: Implement `PhotoFrigo`**

- Bouton « 📸 Photo de frigo » (ouvre un input file caché, accept="image/*").
- Preview de la photo sélectionnée + bouton « Analyser ».
- Compression client : redimensionner à 800 px max, JPEG 0,7, via canvas.
- Pendant l'analyse : « Miamz observe ton frigo… » avec animation.
- Résultats :
  - Ingrédients détectés (chips).
  - Recettes qui matchent (cartes cliquables → ouvre la fiche).
  - Brouillon proposé (bouton « Utiliser ce brouillon » → préremplit le formulaire).
- Erreur : message doux + « Réessayer ».

- [ ] **Step 2: Wire into recipes page**

Ajouter le bouton `PhotoFrigo` dans la page recettes (à côté de « + Nouvelle recette »). Passer les recettes et un callback `onBrouillon` qui préremplit le formulaire (réutiliser `remplirDepuisRecette`).

- [ ] **Step 3: Verify build and tests** — `npm test` puis `npm run build` → verts.

- [ ] **Step 4: Commit** — `git add src/components/recettes/photo-frigo.tsx src/app/(app)/recettes/page.tsx; git commit -m "feat: add photo-frigo UI on recipes page"`.

---

### Task 5: Gate final et déploiement

- [ ] **Step 1: Full suite** — `npm test` → verts.
- [ ] **Step 2: Production build** — `npm run build` → vert.
- [ ] **Step 3: Scope check** — `git diff --stat` → uniquement les fichiers des tâches 1-4.
- [ ] **Step 4: Push** — `git push origin main`.
- [ ] **Step 5: Ledger** — mettre à jour le progress.md.

# Plan 2c « Confort d'usage » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'usage quotidien fluide : recherche/filtres/tri instantanés dans Recettes, fiche recette en bottom sheet, bottom sheet universelle pour le Plan (créer/modifier/déplacer/supprimer au doigt), chargements Miamz animés, rayons de courses repliables.

**Architecture:** Toute la logique de recherche/filtrage/tri vit dans un utilitaire pur testé (`recherche-recettes.ts`), consommé par l'onglet Recettes ET la feuille du Plan. Les deux bottom sheets partagent une même coquille modale accessible (`FeuilleModale`). Les chargements utilisent MiamzSvg existant avec un nouveau keyframe, en composants serveur (pas d'hydratation).

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind 4, Vitest (logique pure), SVG inline (zéro dépendance).

**Spec:** `docs/superpowers/specs/2026-11-17-confort-usage-design.md` (approuvé, avec résolutions du builder-check)

## Global Constraints

- Mobile + desktop : 360 px → desktop, cibles tactiles ≥ 44 px, `env(safe-area-inset-bottom)`, **aucun débordement de page** (le scroll horizontal de la grille hebdo est le seul toléré).
- Animations `transform`/`opacity` uniquement ; `prefers-reduced-motion` → tout s'arrête, l'information reste lisible.
- UI 100 % française ; identifiants de domaine en français ; palette pastel (#FFB5C2 #A8E6CF #FFF9E6 #C9B6E4 #4A6741 #E07A5F) / Fredoka.
- **Zéro nouvelle dépendance npm** ; SVG inline type Lucide (pattern nav-bar).
- TDD sur la logique pure (Vitest) ; `npm test` + `npm run build` verts avant chaque commit.
- Événements Miamz : **seuls** création (`repas-planifie`) et suppression (`repas-retire`) d'un repas émettent ; **aucune modification** (portions, déplacement, changement de recette) n'émet.
- Jamais d'écrasement silencieux d'une case occupée (cibles occupées désactivées + annotées « occupé »).

## Review Focus

1. **Requête blanche** («   ») dans la recherche → toutes les recettes s'affichent, jamais zéro — test dans Task 1 (`correspondRecette`, cas vide/blanc).
2. **œ et accents** : « oeufs » doit trouver « Œufs brouillés », « creme » doit trouver « crème » — tests dans Task 1 (`normaliser` + `correspondRecette`).
3. **Modification sans événement** : PATCH (portions/déplacement/recette) n'appelle jamais `emettre` — étape de vérification dédiée dans Task 3.
4. **`prefers-reduced-motion`** : Miamz du loader statique + message lisible, squelettes immobiles — sélecteurs exacts à ajouter au bloc `@media` dans Task 4.
5. **360 px** : la feuille ne déborde pas (`max-h` + scroll interne), la barre de recherche sticky reste sous la top bar — checklist manuelle dans Task 6.

---

### Task 1: Utilitaire pur de recherche/filtres/tri

**Files:**
- Create: `src/lib/recherche-recettes.ts`
- Test: `tests/recherche-recettes.test.ts`

**Interfaces:**
- Consumes: rien (pur).
- Produces (utilisé par Tasks 2 et 3) :
  - `normaliser(texte: string): string` — minuscules, NFD sans diacritiques, œ→oe, æ→ae.
  - `nomsIngredients(ingredients: unknown): string[]` — extrait les `nom` valides d'un champ Json Prisma (tolérant : null/array hétérogène).
  - `correspondRecette(recette: { title: string; ingredientNoms: string[] }, requete: string): boolean` — jetons en ET, chacun sur le titre OU un ingrédient (sous-chaîne normalisée) ; requête sans jeton → `true`.
  - `filtrerRecettes<T extends RecetteRecherchable>(recettes: T[], filtres: { requete: string; tags: string[]; dureeMax: number | null }): T[]` — tags cumulables en ET ; `dureeMax: null` = toutes ; `minutes: null` exclu des filtres de durée.
  - `trierRecettes<T extends RecetteRecherchable>(recettes: T[], tri: Tri): T[]` — `"recent"` conserve l'ordre d'entrée (le serveur trie déjà par `createdAt desc`), `"alpha"` `localeCompare` fr, `"duree"` croissant avec `null` en dernier.
  - `type RecetteRecherchable = { id: string; title: string; minutes: number | null; tags: string[]; ingredientNoms: string[] }`, `type Tri = "recent" | "alpha" | "duree"`.

- [ ] **Step 1: Write the failing test** — `tests/recherche-recettes.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { correspondRecette, filtrerRecettes, normaliser, nomsIngredients, trierRecettes } from "@/lib/recherche-recettes";

describe("normaliser", () => {
  it("retire accents, œ, æ et met en minuscules", () => {
    expect(normaliser("Œufs à la crème")).toBe("oeufs a la creme");
    expect(normaliser("Ça, l'œil d'Anaïs")).toBe("ca, l'oeil d'anais");
  });
});

describe("nomsIngredients", () => {
  it("extrait les noms d'un Json tolérant", () => {
    expect(nomsIngredients([{ nom: "pâtes" }, { quantite: 2 }, "farine", null])).toEqual(["pâtes", "farine"]);
    expect(nomsIngredients(null)).toEqual([]);
    expect(nomsIngredients("pas un tableau")).toEqual([]);
  });
});

describe("correspondRecette", () => {
  const gratin = { title: "Gratin de courgettes", ingredientNoms: ["courgettes", "crème fraîche", "emmental"] };
  it("matche un jeton sur le titre ou un ingrédient (sous-chaîne)", () => {
    expect(correspondRecette(gratin, "courgette")).toBe(true);
    expect(correspondRecette(gratin, "emmental")).toBe(true);
    expect(correspondRecette(gratin, "courget")).toBe(true);
    expect(correspondRecette(gratin, "tomate")).toBe(false);
  });
  it("exige tous les jetons (ET), chacun sur le titre OU un ingrédient (OU)", () => {
    expect(correspondRecette(gratin, "gratin courgettes")).toBe(true);
    expect(correspondRecette(gratin, "gratin emmental")).toBe(true);
    expect(correspondRecette(gratin, "gratin tomate")).toBe(false);
  });
  it("ignore accents et œ", () => {
    expect(correspondRecette({ title: "Œufs brouillés", ingredientNoms: ["œufs", "beurre"] }, "oeufs")).toBe(true);
    expect(correspondRecette(gratin, "creme fraiche")).toBe(true);
  });
  it("requête vide ou blanche = tout matche", () => {
    expect(correspondRecette(gratin, "")).toBe(true);
    expect(correspondRecette(gratin, "   ")).toBe(true);
  });
});

const base = { id: "x", tags: [] as string[] };
const a = { ...base, id: "a", title: "Salade", minutes: 20, ingredientNoms: ["riz", "thon"], tags: ["végé", "rapide"] };
const b = { ...base, id: "b", title: "Bœuf bourguignon", minutes: 45, ingredientNoms: ["bœuf", "carotte"], tags: ["végé"] };
const c = { ...base, id: "c", title: "Mystère", minutes: null, ingredientNoms: [], tags: [] };

describe("filtrerRecettes", () => {
  it("filtre par durée : minutes null dans Toutes, hors ≤N", () => {
    expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: null }).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: 30 }).map((r) => r.id)).toEqual(["a"]);
  });
  it("filtre par tags cumulables (ET)", () => {
    expect(filtrerRecettes([a, b, c], { requete: "", tags: ["végé", "rapide"], dureeMax: null }).map((r) => r.id)).toEqual(["a"]);
  });
  it("combine requête, durée et tags", () => {
    expect(filtrerRecettes([a, b, c], { requete: "boeuf", tags: [], dureeMax: null }).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("trierRecettes", () => {
  it("recent conserve l'ordre d'entrée", () => {
    expect(trierRecettes([b, a, c], "recent").map((r) => r.id)).toEqual(["b", "a", "c"]);
  });
  it("alpha trie en français", () => {
    expect(trierRecettes([b, a, c], "alpha").map((r) => r.id)).toEqual(["b", "c", "a"]); // Bœuf, Mystère, Salade
  });
  it("duree croissant avec null en dernier", () => {
    expect(trierRecettes([c, b, a], "duree").map((r) => r.id)).toEqual(["a", "b", "c"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- recherche-recettes`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implement `src/lib/recherche-recettes.ts`**

```ts
/**
 * Recherche, filtres et tri de recettes — pur et testé.
 * Sémantique (design doc 2c) : jetons en ET, champs (titre/ingrédients) en OU,
 * normalisation accents + œ/æ ; minutes null = « Toutes » seulement, dernière au tri durée.
 */

export type RecetteRecherchable = {
  id: string;
  title: string;
  minutes: number | null;
  tags: string[];
  ingredientNoms: string[];
};

export type Tri = "recent" | "alpha" | "duree";

export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function nomsIngredients(ingredients: unknown): string[] {
  if (!Array.isArray(ingredients)) return [];
  return ingredients
    .filter((i): i is { nom: unknown } => typeof i === "object" && i !== null && "nom" in i)
    .map((i) => i.nom)
    .filter((nom): nom is string => typeof nom === "string" && nom.length > 0);
}

export function correspondRecette(recette: { title: string; ingredientNoms: string[] }, requete: string): boolean {
  const jetons = normaliser(requete).split(/\s+/).filter(Boolean);
  if (jetons.length === 0) return true;
  const titre = normaliser(recette.title);
  const ingredients = recette.ingredientNoms.map(normaliser);
  return jetons.every((jeton) => titre.includes(jeton) || ingredients.some((ing) => ing.includes(jeton)));
}

export function filtrerRecettes<T extends RecetteRecherchable>(
  recettes: T[],
  filtres: { requete: string; tags: string[]; dureeMax: number | null }
): T[] {
  return recettes.filter((r) => {
    if (!correspondRecette(r, filtres.requete)) return false;
    if (!filtres.tags.every((t) => r.tags.includes(t))) return false;
    if (filtres.dureeMax !== null && (r.minutes === null || r.minutes > filtres.dureeMax)) return false;
    return true;
  });
}

export function trierRecettes<T extends RecetteRecherchable>(recettes: T[], tri: Tri): T[] {
  const copie = [...recettes];
  if (tri === "alpha") copie.sort((x, y) => x.title.localeCompare(y.title, "fr"));
  if (tri === "duree") copie.sort((x, y) => (x.minutes ?? Infinity) - (y.minutes ?? Infinity));
  return copie; // "recent" : l'ordre serveur (createdAt desc) est conservé
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- recherche-recettes`
Expected: PASS (tous les cas).

- [ ] **Step 5: Commit**

```bash
git add tests/recherche-recettes.test.ts src/lib/recherche-recettes.ts
git commit -m "feat: pure recipe search/filter/sort utility (tokens AND, fields OR, oe/ae normalization)"
```

---

### Task 2: Coquille modale + onglet Recettes (recherche, filtres, fiche, suppression dans la fiche)

**Files:**
- Create: `src/components/ui/feuille-modale.tsx`
- Create: `src/components/recettes/feuille-recette.tsx`
- Create: `src/components/recettes/recettes-client.tsx`
- Modify: `src/app/(app)/recettes/page.tsx`
- Modify: `src/components/recettes/recette-card.tsx`

**Interfaces:**
- Consumes (Task 1) : `nomsIngredients`, `filtrerRecettes`, `trierRecettes`, types `RecetteRecherchable`, `Tri`.
- Produces (Task 3 réutilise la coquille) :
  - `FeuilleModale({ ouvert: boolean; onFermer: () => void; titre: string; children: ReactNode; footer?: ReactNode })` — `role="dialog"` `aria-modal`, fermeture Esc + clic arrière-plan, focus sur le panneau à l'ouverture, panneau bas de page `max-h-[85dvh] overflow-y-auto`, padding bas avec `env(safe-area-inset-bottom)`.
  - `FeuilleRecette({ recette: RecetteFiche | null; onFermer: () => void })` avec `RecetteFiche = { id: string; title: string; servings: number; minutes: number | null; tags: string[]; ingredients: unknown }` — fiche complète (méta, ingrédients formatés, étapes) + footer Supprimer (DELETE `/api/recipes/{id}` → `router.refresh()` + fermer ; **n'émet aucun événement Miamz**, règle du ledger 2a).
  - `RecetteCard({ recette, onOuvrir })` — la carte entière est **un unique `<button>`** (plus d'interactif imbriqué, bouton Supprimer retiré de la carte).

- [ ] **Step 1: Implement `FeuilleModale` in `src/components/ui/feuille-modale.tsx`**

Composant client. `useEffect` : écoute `keydown` (Escape → `onFermer`) et `ref.current?.focus()` à l'ouverture ; `tabIndex={-1}` sur le panneau. Arrière-plan : `<button aria-label="Fermer" className="fixed inset-0 bg-black/30" onClick={onFermer} />`. Panneau : `fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-lg rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-lg max-h-[85dvh] overflow-y-auto`. Poignée visuelle (barre 40×4 arrondie, `bg-gray-200`, centrée) en haut.

- [ ] **Step 2: Implement `FeuilleRecette` in `src/components/recettes/feuille-recette.tsx`**

Client. Rend `FeuilleModale` avec `titre={recette.title}` si `recette` non null (sinon `null`). Contenu : méta (`{servings} portion(s){minutes ? ` · ${minutes} min` : ""}`), chips de tags (style existant `bg-[#A8E6CF]/40`), liste d'ingrédients formatés via helper local `formaterIngredient(i: unknown): string` (nom + ` — quantite unite` si présents ; réutilise `nomsIngredients`-style de tolérance mais garde quantité : `typeof i === "object" && i !== null && "nom" in i`), étapes en `<ol>` numéroté. `footer` : bouton Supprimer pleine largeur `min-h-11` (`bg-[#B0413E]/10 text-[#B0413E]`, label « Supprimer la recette » puis « Suppression… » pendant `enCours`).

- [ ] **Step 3: Implement `RecettesClient` in `src/components/recettes/recettes-client.tsx`**

Props : `{ recettes: RecetteVue[] }` avec `RecetteVue = { id: string; title: string; servings: number; minutes: number | null; tags: string[]; ingredients: unknown }`. État : `requete`, `tagsChoisis: string[]`, `dureeMax: number | null`, `tri: Tri`, `recetteOuverte: RecetteVue | null`. Dérivé (mémo simple, pas de `useMemo` nécessaire) : `recettesRecherchables = recettes.map((r) => ({ ...r, ingredientNoms: nomsIngredients(r.ingredients) }))`, puis `filtrerRecettes` + `trierRecettes`. UI :
- Recherche sticky sous la top bar mobile : `<div className="sticky top-[3.5rem] z-10 -mx-4 bg-[#FFF9E6]/95 px-4 py-2 backdrop-blur">` avec input `min-h-11 rounded-full border …` placeholder « Rechercher un titre ou un ingrédient… ».
- Chips de tags : tous les tags distincts triés fr ; boutons `min-h-9 rounded-full px-3` — sélectionnés `bg-[#4A6741] text-white`, sinon `bg-white`. Clic = toggle (ET cumulable).
- Puces durée : `Toutes / ≤ 20 min / ≤ 30 min / ≤ 45 min` (valeurs `null / 20 / 30 / 45`), même style, exclusives (radio).
- Tri : `<select>` compact `Récent / A → Z / Durée` aligné à droite de la ligne des puces durée.
- Comptage : « {resultats.length} recette(s) trouvée(s) » (`text-sm text-gray-500`).
- Résultats : grille `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` de `RecetteCard onOuvrir={() => setRecetteOuverte(r)}`.
- État vide résultats (recettes non vides mais filtrées à rien) : carte blanche « Aucune recette ne correspond. » + bouton « Réinitialiser les filtres » (remet tous les états à zéro, `min-h-11`).
- Rendu final : `<FeuilleRecette recette={recetteOuverte} onFermer={() => setRecetteOuverte(null)} />`.

- [ ] **Step 4: Rework `RecetteCard`** — carte = unique `<button type="button" onClick={onOuvrir} className="w-full rounded-3xl bg-white p-5 text-left shadow-sm transition hover:shadow-md">` ; nouvelle prop `onOuvrir: () => void` ; **supprimer** le bouton Supprimer, `useRouter` et l'état `enCours` ; garder titre/portions/minutes/tags tels quels.

- [ ] **Step 5: Wire `recettes/page.tsx`** — remplace la grille + état vide « cuisine vide » par `<RecettesClient recettes={recipes.map((r) => ({ id: r.id, title: r.title, servings: r.servings, minutes: r.minutes, tags: r.tags, ingredients: r.ingredients }))} />` ; garde l'en-tête (titre + lien « + Nouvelle recette ») et le cas `recipes.length === 0` (cuisine vide) côté serveur. `createdAt` inutile : tri « Récent » = ordre serveur.

- [ ] **Step 6: Verify**

Run: `npm test` puis `npm run build`
Expected: 44+ tests PASS, build vert, aucun warning nouveau.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/feuille-modale.tsx src/components/recettes/ src/app/\(app\)/recettes/page.tsx
git commit -m "feat: recipe search, filters, sort, fiche bottom sheet (delete in sheet, single tap-target card)"
```

---

### Task 3: FeuilleRepas — bottom sheet universelle du Plan

**Files:**
- Create: `src/components/plan/feuille-repas.tsx`
- Modify: `src/components/plan/grille.tsx`
- Modify: `src/app/(app)/plan/page.tsx`

**Interfaces:**
- Consumes (Task 1) : `nomsIngredients`, `filtrerRecettes` (requete seule) ; (Task 2) : `FeuilleModale`.
- Produces : `FeuilleRepas({ cible: { date: string; slot: string }; entry: EntryVue | null; recipes: RecetteChoix[]; clesOccupees: Set<string>; dates: string[]; slots: string[]; slotLabels: Record<string, string>; onFermer: () => void })` avec `RecetteChoix = { id: string; title: string; minutes: number | null; ingredients: unknown }` et `EntryVue` inchangé (type local grille). Grille exporte `type EntryVue` ou le redéclare identique.

- [ ] **Step 1: Implement `FeuilleRepas`**

Client. État : `requete` (pré-rempli `entry?.title` en édition), `recetteChoisie` (pré-remplie `entry?.recipeId`, sinon première recette), `servings` (`entry?.servings ?? 2`), `jour`/`service` (pré-remplis avec `cible`), `enCours`, `erreur`. Contenu dans `FeuilleModale` :
- Titre : formaté `{label du jour} · {slotLabels[slot]}` (label du jour via `Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", timeZone: "UTC" })`) ; en édition, sous-titre « Modifier le repas » / création « Nouveau repas ».
- Liste de recettes rechercheable : `filtrerRecettes(recettesRecherchables, { requete, tags: [], dureeMax: null })` — boutons pleine largeur `min-h-11 text-left` (titre + `· {minutes} min` si présent), sélectionnée `bg-[#A8E6CF]/40` ; vide → « Aucune recette ne correspond. ».
- Portions : stepper `−  N  +` (boutons 44×44, `servings` borné 1..12, même règle que l'API).
- « Déplacer vers » (édition seulement) : deux `<select>` `min-h-11` (jour = `dates`, service = `slots`+labels) ; chaque `<option>` dont la clé `` `${date}|${slot}` `` est dans `clesOccupees` est `disabled` avec suffixe « — occupé » ; la position actuelle de l'entrée reste disponible (no-op).
- Footer : création → « Ajouter au planning » (`bg-[#4A6741] text-white min-h-11 flex-1`) ; édition → « Enregistrer » + « Supprimer » (`text-[#B0413E]`, dernière position, `min-h-11`).

Actions (toutes : `finally` `setEnCours(false)`, puis `onFermer()` + `router.refresh()`) :
- **Ajouter** : `POST /api/plan { date: jour, slot: service, recipeId, servings }` ; si `res.ok` → `emettre("repas-planifie")`.
- **Enregistrer** : `PATCH /api/plan/{entry.id}` avec **uniquement les champs changés** — `servings` si ≠, `recipeId` si ≠, `date` + `slot` ensemble si (jour,service) ≠ position actuelle. `res.ok` → **aucun `emettre`** (règle globale) ; 409 → `erreur = "Une case occupe déjà ce créneau"` (défensif, cibles déjà désactivées).
- **Supprimer** (édition) : `DELETE /api/plan/{entry.id}` ; `res.ok` → `emettre("repas-retire")`.

- [ ] **Step 2: Rework `grille.tsx`** — supprime le formulaire inline (`caseActive` + bloc JSX dans la cellule) et les états `recetteChoisie`/`servings`. Nouvel état : `feuille: { date: string; slot: string; entry: EntryVue | null } | null`. Case vide : le bouton `+` → `setFeuille({ date, slot, entry: null })`. Case occupée : le contenu (`title`, portions) est enveloppé dans `<button type="button" onClick={() => setFeuille({ date, slot, entry })} className="w-full text-left">` à l'intérieur du wrapper `draggable` existant (drag desktop conservé tel quel) ; **le bouton « retirer » disparaît** (suppression dans la feuille). Rendu final : `<FeuilleRepas cible={feuille} … onFermer={() => setFeuille(null)} />` — `clesOccupees = new Set(entries.filter((e) => e.id !== feuille?.entry?.id).map((e) => `${e.date.slice(0, 10)}|${e.slot}`))`.

- [ ] **Step 3: Wire `plan/page.tsx`** — étends le select des recettes à `{ id: true, title: true, minutes: true, ingredients: true }` (la feuille cherche dans les ingrédients et affiche la durée).

- [ ] **Step 4: Verify (y compris la règle d'événements)**

Run: `npm test` puis `npm run build`
Expected: suite PASS, build vert. **Vérification dédiée** : dans `feuille-repas.tsx`, `emettre` n'apparaît qu'avec `"repas-planifie"` (POST) et `"repas-retire"` (DELETE) — aucun appel sur le chemin PATCH.

- [ ] **Step 5: Commit**

```bash
git add src/components/plan/ src/app/\(app\)/plan/page.tsx
git commit -m "feat: universal meal bottom sheet (create/edit/move/delete, no event on edit, drag kept)"
```

---

### Task 4: Chargements Miamz (keyframes, loading.tsx ×3, bouton Google)

**Files:**
- Create: `src/components/miamz/chargement.tsx`
- Create: `src/app/(app)/plan/loading.tsx`, `src/app/(app)/recettes/loading.tsx`, `src/app/(app)/courses/loading.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/connexion/page.tsx`

**Interfaces:**
- Consumes: `MiamzSvg` (props `taille`, `animation`, `pose`).
- Produces: `ChargementMiamz({ message?: string })` — **composant serveur** (aucun hook) : Miamz 72 px avec `animation="miamz-attente 1.6s ease-in-out infinite"` + message ; message par défaut pioché dans un pool de 5 via `Date.now() % pool.length` (composant serveur → rendu uniquement côté serveur, aucun risque d'hydratation ; `Date.now()` plutôt que `Math.random` par décision du design doc). `role="status"` `aria-live="polite"` sur le conteneur.

- [ ] **Step 1: Add keyframes + squelette to `globals.css`** — après `miamz-bulle` :

```css
@keyframes miamz-attente {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-3px) rotate(-9deg); }
  75% { transform: translateY(-3px) rotate(9deg); }
}
@keyframes miamz-squelette {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.miamz-squelette {
  animation: miamz-squelette 1.4s ease-in-out infinite;
}
```

- [ ] **Step 2: Extend the reduced-motion block** — ajoute `.miamz-squelette` à la liste existante du `@media (prefers-reduced-motion: reduce)` (`.miamz-anim, .miamz-yeux, .miamz-bulle, .miamz-squelette { animation: none !important; }`). L'anim inline `miamz-attente` est déjà couverte par `.miamz-anim`. Résultat attendu : Miamz statique, message et structures lisibles.

- [ ] **Step 3: Implement `ChargementMiamz`** (signature ci-dessus, pool : « Miamz mijote… », « On fouette les œufs… », « On coupe les petits légumes… », « Ça chauffe ! », « On dresse les assiettes… »).

- [ ] **Step 4: Create the 3 `loading.tsx`** — chacun : `<main>` (même padding que la page) contenant `<ChargementMiamz />` + squelettes pastel en `div` `rounded-3xl bg-white shadow-sm` avec barres internes `className="miamz-squelette rounded-full bg-gray-200"` : plan = en-tête 2 barres + grille de cellules (hauteurs `h-28`) ; recettes = 3 cartes (`h-40`) ; courses = 3 sections avec 4 lignes `h-6`. Formes libres (builder), une seule contrainte : classes `.miamz-squelette` sur les barres, aucune largeur figée en px.

- [ ] **Step 5: Google button pending state in `connexion/page.tsx`** — état `googleEnCours` ; `onClick={() => { setGoogleEnCours(true); signIn("google", { callbackUrl: "/plan" }); }}` ; bouton `disabled={googleEnCours || enCours}` avec label conditionnel « Miamz va chercher Google… ».

- [ ] **Step 6: Verify**

Run: `npm test` puis `npm run build`
Expected: suite PASS, build vert ; `loading.tsx` visibles en `next dev` (throttle réseau) avec Miamz roulant.

- [ ] **Step 7: Commit**

```bash
git add src/components/miamz/chargement.tsx src/app/globals.css src/app/connexion/page.tsx src/app/\(app\)
git commit -m "feat: Miamz loading states (rolling mascot, skeletons, Google button pending)"
```

---

### Task 5: Rayons de courses repliables avec progression

**Files:**
- Modify: `src/components/courses/liste.tsx`

**Interfaces:**
- Consumes: rien de nouveau (props inchangées).
- Produces: chaque rayon = `<details open>` avec `<summary>` accessible : nom du rayon + « {cochees}/{total} » ; chevron inline SVG (rotation 180° quand ouvert, `transition-transform`).

- [ ] **Step 1: Rework the rayon sections** — remplace `<section>` par :

```tsx
<details key={g.rayon} open className="group rounded-3xl bg-white shadow-sm">
  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 py-3 [&::-webkit-details-marker]:hidden">
    <span className="text-sm font-semibold uppercase tracking-wide text-[#8fb5a2]">
      {g.rayon} · {g.items.filter((i) => i.checked).length}/{g.items.length}
    </span>
    <svg …chevron className="transition-transform group-open:rotate-180" />
  </summary>
  <ul className="flex flex-col gap-1 px-5 pb-4">{/* ul existant inchangé */}</ul>
</details>
```

- [ ] **Step 2: Verify**

Run: `npm test` puis `npm run build`
Expected: suite PASS, build vert.

- [ ] **Step 3: Commit**

```bash
git add src/components/courses/liste.tsx
git commit -m "feat: collapsible grocery rayons with per-rayon checked progress"
```

---

### Task 6: Vérification finale, push, validation Steve, revue de branche

**Files:**
- Modify: aucun (ou correctifs issus de la revue)

- [ ] **Step 1: Full verification** — `npm test` (44+ PASS) et `npm run build` (vert).

- [ ] **Step 2: Checklist 360 px** (relecture de code, puis Steve au téléphone) : feuille `max-h-[85dvh] overflow-y-auto` ; recherche recettes sticky sans recouvrir la top bar ; chips en scroll horizontal sans débordermer la page ; grille plan inchangée (seul scroll horizontal toléré).

- [ ] **Step 3: Push** — `git push` (déploiement Vercel auto), demander la **validation de Steve sur téléphone** (recherche recettes, feuille du plan au doigt, chargements, rayons).

- [ ] **Step 4: Après validation Steve** — tag : `git tag -a v0.3.0-confort -m "Plan 2c: confort d'usage" && git push origin v0.3.0-confort`.

- [ ] **Step 5: Revue finale de la branche entière** — revue à contexte frais de tout ce qui est arrivé depuis `v0.1.0-socle` (skill requesting-code-review, script review-package + sous-agent reviewer avec `code-reviewer.md` et le Review Focus de ce plan) ; une passe de correctifs si besoin (`npm test` + `npm run build` + push après chaque correctif).

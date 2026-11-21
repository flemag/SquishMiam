# Sélecteur de recettes + catégories — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le champ texte unique de la feuille d'ajout de repas par un vrai sélecteur (catégorie + durée + texte) adossé à des catégories stockées en base, créables à la volée par tout utilisateur connecté.

**Architecture:** Une table `Categorie` globale (pas de propriétaire), seedée avec 9 catégories à ids stables, et une colonne `Recipe.categorieId` nullable (`onDelete: SetNull`). Les pages serveur lisent les catégories visibles et les passent en props ; aucun endpoint de lecture. Le filtre par catégorie rejoint la logique pure existante `filtrerRecettes` (ET avec texte, tags et durée). Un seul endpoint d'écriture, `POST /api/categories`, dédoublonne par clé normalisée (accents/casse/espaces).

**Tech Stack:** Next.js 15 App Router, Prisma 6 (Neon), TypeScript, Tailwind v4, Vitest. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-20-selecteur-recettes-design.md`

## Global Constraints

- Zéro nouvelle dépendance npm.
- TDD sur la logique pure (Vitest) : test écrit d'abord, échec vérifié, puis implémentation.
- `npm test` ET `npm run build` verts avant **chaque** commit (build ~2 min, timeout ≥ 600000 ms).
- Mobile 360 px : cibles ≥ 44 px, aucun débordement horizontal de page (seules les rangées de chips défilent), français, Fredoka.
- Classes sémantiques existantes : `.carte`, `.bouton`, `.bouton-secondaire`, `.champ`, `.puce`. Couleurs actives des chips : `bg-[#4A6741] text-white` ; inactives : `border border-bordure bg-white text-texte-doux`.
- Tout clic réseau affiche un libellé d'attente (bouton désactivé : « Création… »).
- Windows/PowerShell ; git absent du PATH : `"C:\Program Files\Git\cmd\git.exe"`. Ne jamais utiliser Get-Content/Set-Content sur de l'UTF-8.
- Aucune signature d'API existante ne doit changer de forme : `categorieId` est toujours **optionnel** côté filtre et côté corps de requête.

## Review Focus

1. **Nom de catégorie déjà existant avec une autre casse/des accents** (« Végé » puis « VEGE ») → une seule ligne en base, réponse `200` avec l'existante. Tests : `normaliserCategorie` (Task 2) + revue du pré-check de `POST /api/categories` (Task 4).
2. **Création de recette avec une catégorie masquée ou inconnue** (formulaire resté ouvert après un masquage admin futur) → `400 { error: "Catégorie inconnue" }`, jamais de recette orpheline. Pin : revue de la validation `POST`/`PATCH` (Task 4).
3. **Recettes existantes après migration** → toutes rattachées à « Autre », aucune invisible dans les filtres. Preuve : script de vérification `sans categorie: 0` (Task 1).
4. **Filtres combinés** (catégorie + durée + texte) → ET strict, aucune recette qui ne satisfait pas tous les filtres actifs. Tests : `filtrerRecettes` (Task 3).
5. **Aucun résultat dans la feuille de repas** → l'utilisateur peut toujours revenir à la liste complète via « Réinitialiser les filtres » (pas de cul-de-sac). Pin : revue de la feuille (Task 6).

---

### Task 1: Base de données — `Categorie`, seed et backfill

**Files:**
- Modify: `prisma/schema.prisma` (ajout du modèle après `Recipe` ; trois lignes dans `Recipe`)
- Create: `prisma/migrations/<timestamp>_add_categories/migration.sql` (généré puis complété)

**Interfaces:**
- Consumes: rien.
- Produces (Tasks 2–7) : table `Categorie { id, nom, cle, masquee, createdAt }` peuplée avec 9 lignes aux ids stables `cat-pates`, `cat-vege`, `cat-viande`, `cat-poisson`, `cat-soupe`, `cat-salade`, `cat-oeufs`, `cat-dessert`, `cat-autre` ; colonne `Recipe.categorieId String?` avec backfill à `cat-autre`.

- [ ] **Step 1: Ajouter les modèles au schéma**

Dans `prisma/schema.prisma`, ajouter dans `model Recipe` (après `createdBy`) :

```prisma
  categorieId String?
  categorie   Categorie? @relation(fields: [categorieId], references: [id], onDelete: SetNull)
```

et ajouter `@@index([categorieId])` à la fin de `model Recipe` (avant l'accolade fermante).

Puis ajouter après `model Recipe` :

```prisma
model Categorie {
  id        String   @id @default(cuid())
  nom       String
  cle       String   @unique
  masquee   Boolean  @default(false)
  createdAt DateTime @default(now())
  recettes  Recipe[]
}
```

- [ ] **Step 2: Générer la migration sans l'appliquer**

Run: `npx prisma migrate dev --create-only --name add_categories`
Expected: dossier `prisma/migrations/<timestamp>_add_categories/` créé ; « Your migration is now created ». Ne pas répondre à un éventuel prompt de reset — il ne doit pas y en avoir.

- [ ] **Step 3: Compléter la migration avec le seed et le backfill**

À la fin du `migration.sql` généré, ajouter exactement :

```sql
-- Seed des catégories de départ (ids stables)
INSERT INTO "Categorie" ("id", "nom", "cle") VALUES
  ('cat-pates',   'Pâtes, riz & céréales', 'pates, riz & cereales'),
  ('cat-vege',    'Végé',                  'vege'),
  ('cat-viande',  'Viande',                'viande'),
  ('cat-poisson', 'Poisson',               'poisson'),
  ('cat-soupe',   'Soupe',                 'soupe'),
  ('cat-salade',  'Salade',                'salade'),
  ('cat-oeufs',   'Œufs & brunch',         'oeufs & brunch'),
  ('cat-dessert', 'Dessert',               'dessert'),
  ('cat-autre',   'Autre',                 'autre')
ON CONFLICT ("id") DO NOTHING;

-- Backfill : aucune recette existante ne reste sans catégorie
UPDATE "Recipe" SET "categorieId" = 'cat-autre' WHERE "categorieId" IS NULL;
```

- [ ] **Step 4: Appliquer la migration**

Run: `npx prisma migrate dev`
Expected: migration appliquée, « Your database is now in sync », client Prisma régénéré.

- [ ] **Step 5: Vérifier le schéma et les données**

Run: `npx prisma validate` → « The schema is valid ».

Run (PowerShell, une seule ligne, guillemets simples externes) :

```powershell
node --input-type=module -e 'import {PrismaClient} from "@prisma/client"; const p=new PrismaClient(); const cats=await p.categorie.findMany({orderBy:{nom:"asc"}}); console.log(cats.map(c=>c.id+"="+c.nom).join("\n")); console.log("sans categorie:", await p.recipe.count({where:{categorieId:null}})); await p.$disconnect();'
```

Expected: 9 lignes `cat-…=Nom`, toutes les 9 clés présentes, puis `sans categorie: 0`.

- [ ] **Step 6: Gate et commit**

Run: `npm test` → 70/70 verts (aucun test modifié).
Run: `npm run build` → vert.

```powershell
"C:\Program Files\Git\cmd\git.exe" add prisma/schema.prisma prisma/migrations
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add category model, seed and recipe backfill"
```

---

### Task 2: `normaliserCategorie` (TDD)

**Files:**
- Create: `src/lib/categories.ts`
- Test: `tests/categories.test.ts`

**Interfaces:**
- Consumes: `normaliser` de `@/lib/recherche-recettes`.
- Produces (Tasks 4–7) :
  ```ts
  export const CATEGORIE_AUTRE = "cat-autre";
  export type CategorieVue = { id: string; nom: string };
  export function normaliserCategorie(nom: string): string; // minuscules, sans accents, œ/æ dépliés, trim, espaces internes compactés
  ```

- [ ] **Step 1: Écrire le test qui échoue**

`tests/categories.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { CATEGORIE_AUTRE, normaliserCategorie } from "@/lib/categories";

describe("normaliserCategorie", () => {
  it("normalise accents, casse et œ/æ", () => {
    expect(normaliserCategorie("Végé")).toBe("vege");
    expect(normaliserCategorie("VÉGÉ")).toBe("vege");
    expect(normaliserCategorie("Œufs & brunch")).toBe("oeufs & brunch");
  });
  it("compacte les espaces internes et les bords", () => {
    expect(normaliserCategorie("  Pâtes,   riz & céréales  ")).toBe("pates, riz & cereales");
  });
  it("renvoie une chaîne vide pour un nom vide ou blanc", () => {
    expect(normaliserCategorie("")).toBe("");
    expect(normaliserCategorie("   ")).toBe("");
  });
  it("expose l'id stable de la catégorie par défaut", () => {
    expect(CATEGORIE_AUTRE).toBe("cat-autre");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/categories.test.ts`
Expected: FAIL — module `@/lib/categories` introuvable.

- [ ] **Step 3: Implémenter**

`src/lib/categories.ts` : `normaliserCategorie` = `normaliser(nom)` puis `trim()` puis remplacement de `/\s+/g` par un espace. Exporter les trois symboles de l'interface.

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run tests/categories.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/categories.ts tests/categories.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add category name normalization"
```

---

### Task 3: Filtre par catégorie dans `filtrerRecettes` (TDD)

**Files:**
- Modify: `src/lib/recherche-recettes.ts:7-13` (type) et `:46-56` (filtre)
- Test: `tests/recherche-recettes.test.ts:42-58` (fixtures + nouveaux cas)

**Interfaces:**
- Consumes: rien de nouveau.
- Produces (Tasks 6–7) :
  ```ts
  export type RecetteRecherchable = {
    id: string; title: string; minutes: number | null; tags: string[]; ingredientNoms: string[];
    categorieId?: string | null; // optionnel : les appels existants restent valides
  };
  export function filtrerRecettes<T extends RecetteRecherchable>(
    recettes: T[],
    filtres: { requete: string; tags: string[]; dureeMax: number | null; categorieId?: string | null }
  ): T[];
  ```
  `categorieId` absent ou `null` = toutes les catégories ; sinon égalité stricte.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/recherche-recettes.test.ts`, ajouter `categorieId` aux fixtures : `a` → `"cat-salade"`, `b` → `"cat-viande"`, `c` → `null`. Puis un bloc :

```ts
it("filtre par catégorie (égalité stricte) et null = toutes", () => {
  expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: null, categorieId: "cat-salade" }).map((r) => r.id)).toEqual(["a"]);
  expect(filtrerRecettes([a, b, c], { requete: "", tags: [], dureeMax: null, categorieId: null }).map((r) => r.id)).toEqual(["a", "b", "c"]);
});
it("combine catégorie, durée et texte en ET", () => {
  expect(filtrerRecettes([a, b, c], { requete: "salade", tags: [], dureeMax: 20, categorieId: "cat-salade" }).map((r) => r.id)).toEqual(["a"]);
  expect(filtrerRecettes([a, b, c], { requete: "salade", tags: [], dureeMax: 10, categorieId: "cat-salade" })).toEqual([]);
  expect(filtrerRecettes([a, b, c], { requete: "boeuf", tags: [], dureeMax: null, categorieId: "cat-salade" })).toEqual([]);
});
it("une recette sans catégorie n'apparaît pas sous une catégorie", () => {
  expect(filtrerRecettes([c], { requete: "", tags: [], dureeMax: null, categorieId: "cat-salade" })).toEqual([]);
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/recherche-recettes.test.ts`
Expected: FAIL — les cas catégorie renvoient toutes les recettes (ou erreur de type).

- [ ] **Step 3: Implémenter**

Ajouter `categorieId?: string | null` aux deux types. Dans `filtrerRecettes`, après le filtre durée : si `filtres.categorieId != null` et `r.categorieId !== filtres.categorieId`, renvoyer `false`.

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run tests/recherche-recettes.test.ts`
Expected: PASS (tous les cas existants + 3 nouveaux).

- [ ] **Step 5: Gate et commit**

Run: `npm test` (77 verts) puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/recherche-recettes.ts tests/recherche-recettes.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add category filter to recipe search"
```

---

### Task 4: API — création de catégorie et validation des recettes

**Files:**
- Create: `src/app/api/categories/route.ts`
- Modify: `src/lib/recipes-schema.ts:9-16`
- Modify: `src/app/api/recipes/route.ts:23-31`
- Modify: `src/app/api/recipes/[id]/route.ts:23-25`

**Interfaces:**
- Consumes: `normaliserCategorie`, `CATEGORIE_AUTRE` (Task 2) ; table `Categorie` (Task 1).
- Produces (Tasks 5–7) :
  - `POST /api/categories` body `{ nom: string }` → `201 { categorie: { id, nom, cle, masquee, createdAt } }` pour une nouvelle, `200 { categorie }` si la clé existe déjà ; `400 { error: "Catégorie invalide" }` si vide ou > 40 caractères ; `401` non authentifié.
  - `recipeInput` accepte `categorieId?: string`.
  - `POST /api/recipes` : absent → `cat-autre` ; inconnu ou masqué → `400 { error: "Catégorie inconnue" }`.
  - `PATCH /api/recipes/[id]` : même validation quand `categorieId` est fourni ; aucune resynchronisation de courses (règle existante : ingrédients/portions seulement).

- [ ] **Step 1: Ajouter `categorieId` au schéma zod**

Dans `recipeInput`, après `tags` :

```ts
categorieId: z.string().trim().min(1).optional(),
```

- [ ] **Step 2: Créer la route des catégories**

`src/app/api/categories/route.ts` : même motif d'auth que les routes existantes (`auth()` puis `(session?.user as { id?: string })?.id`, `401 { error: "Non authentifié" }`). Lire `body.nom` en tolérant un corps invalide, `trim()`, refuser vide ou > 40 caractères. Calculer `cle = normaliserCategorie(nom)` ; refuser si `cle` vide. `findUnique({ where: { cle } })` → si trouvée, répondre `200 { categorie }`. Sinon `create({ data: { nom, cle } })` → `201 { categorie }`. En cas d'échec de `create` (course P2002), relire par `cle` : si trouvée `200`, sinon `500 { error: "Création impossible" }`.

- [ ] **Step 3: Valider la catégorie à la création d'une recette**

Dans `POST /api/recipes`, après `parsed` : `const categorieId = parsed.data.categorieId ?? CATEGORIE_AUTRE;` puis `findFirst({ where: { id: categorieId, masquee: false }, select: { id: true } })`. Si absent → `400 { error: "Catégorie inconnue" }`. Puis créer avec `{ ...parsed.data, categorieId, createdById: userId }`.

- [ ] **Step 4: Valider la catégorie au PATCH d'une recette**

Dans `PATCH /api/recipes/[id]`, après `parsed` : si `parsed.data.categorieId !== undefined`, vérifier `findFirst({ where: { id: parsed.data.categorieId, masquee: false } })` → sinon `400 { error: "Catégorie inconnue" }`. Ne rien changer d'autre (ni transaction, ni `toucheListe`).

- [ ] **Step 5: Vérifier**

Run: `npm run build` → vert (type-check des routes).
Contrôle manuel après déploiement : depuis le formulaire, créer « Tajines » deux fois → une seule ligne en base, la deuxième requête répond `200`.

- [ ] **Step 6: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/api/categories/route.ts src/lib/recipes-schema.ts src/app/api/recipes/route.ts "src/app/api/recipes/[id]/route.ts"
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add category creation API and recipe category validation"
```

---

### Task 5: Formulaire de recette — champ catégorie + création à la volée

**Files:**
- Modify: `src/app/(app)/recettes/nouvelle/page.tsx` (devient un composant serveur)
- Create: `src/components/recettes/formulaire-recette.tsx` (le formulaire client actuel, déplacé et enrichi)

**Interfaces:**
- Consumes: `CategorieVue`, `CATEGORIE_AUTRE` (Task 2) ; `POST /api/categories` (Task 4) ; `POST /api/recipes` avec `categorieId` (Task 4).
- Produces: `export default function FormulaireRecette({ categories }: { categories: CategorieVue[] })`.

- [ ] **Step 1: Transformer la page en composant serveur**

`src/app/(app)/recettes/nouvelle/page.tsx` : retirer `"use client"`, charger la session (redirection `/connexion` si absente), lire `db.categorie.findMany({ where: { masquee: false }, select: { id: true, nom: true } })`, trier avec `nom.localeCompare(nom, "fr")`, rendre `<FormulaireRecette categories={categories} />`. Déplacer tout le contenu actuel de la page dans `src/components/recettes/formulaire-recette.tsx` (avec `"use client"`, mêmes états et mêmes libellés).

- [ ] **Step 2: Ajouter le champ catégorie**

Dans le formulaire, après « Tags » :

- état initial : `categories.find((c) => c.id === CATEGORIE_AUTRE)?.id ?? categories[0]?.id ?? ""` ;
- état local `categories` initialisé depuis les props (pour ajouter la nouvelle catégorie sans recharger) ;
- `<select>` contrôlé, `aria-label="Catégorie"`, options = catégories triées, plus une option finale `value="__nouvelle"` : « ＋ Nouvelle catégorie… » ;
- quand la valeur choisie est `"__nouvelle"` : afficher un champ « Nom de la catégorie » (`className="champ min-w-0 flex-1"`) et deux boutons `min-h-11` : « Créer » (désactivé si nom blanc ou création en cours, libellé « Création… ») et « Annuler » (revient à la catégorie précédente, mémorisée dans un état) ;
- « Créer » : `POST /api/categories` avec `{ nom }` ; succès → insérer la catégorie dans l'état local (tri `localeCompare("fr")`), la sélectionner, fermer le champ, vider la saisie ; échec → message français (`data.error` sinon « Création impossible — réessaie. »).

- [ ] **Step 3: Envoyer la catégorie**

Dans `enregistrer`, ajouter `categorieId` au corps JSON quand la valeur n'est pas `"__nouvelle"`. Le bouton « Enregistrer la recette » est désactivé aussi tant que `categorieId === "__nouvelle"` (libellé inchangé).

- [ ] **Step 4: Vérifier**

Run: `npm run build` → vert.
Contrôle manuel (après déploiement) : créer « Tajines », enregistrer une recette dessus, puis rouvrir le formulaire → « Tajines » présent dans la liste.

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add "src/app/(app)/recettes/nouvelle/page.tsx" src/components/recettes/formulaire-recette.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add category field and inline category creation to recipe form"
```

---

### Task 6: Feuille d'ajout de repas — sélecteur catégorie + durée

**Files:**
- Modify: `src/app/(app)/plan/page.tsx:25-35,76-89`
- Modify: `src/components/plan/grille.tsx:5,21-33,143-154`
- Modify: `src/components/plan/feuille-repas.tsx:6,9,22-59,162-191`

**Interfaces:**
- Consumes: `filtrerRecettes` avec `categorieId` (Task 3) ; `CategorieVue` (Task 2) ; `Recipe.categorieId` (Task 1).
- Produces: `RecetteChoix` gagne `categorieId: string | null` ; `GrillePlan` et `FeuilleRepas` reçoivent `categories: CategorieVue[]`.

- [ ] **Step 1: Charger et passer les catégories**

`plan/page.tsx` : ajouter à la `Promise.all` une lecture `db.categorie.findMany({ where: { masquee: false }, select: { id: true, nom: true } })`, triée en français ; ajouter `categorieId: true` au `select` des recettes ; passer `categories={categoriesTriees}` à `GrillePlan`. `GrillePlan` : nouveau prop typé `categories: CategorieVue[]`, transmis à `FeuilleRepas`. `RecetteChoix` : ajouter `categorieId: string | null`.

- [ ] **Step 2: Ajouter les deux rangées de filtres**

Dans `FeuilleRepas`, sous le champ de recherche :

- état `categorieFiltre: string | null` (défaut `null`) et `dureeMax: number | null` (défaut `null`) ;
- `visibles = filtrerRecettes(recettesRecherchables, { requete, tags: [], dureeMax, categorieId: categorieFiltre })`, avec `categorieId: r.categorieId` dans les objets recherchables ;
- rangée catégories : conteneur `-mx-4 flex gap-2 overflow-x-auto px-4 pb-1`, `role="group" aria-label="Filtrer par catégorie"`, chip « Toutes » (`null`) puis une chip par catégorie ; chaque chip `min-h-11 shrink-0 rounded-full px-4 text-sm font-medium transition`, `aria-pressed`, styles actif/inactif du Global Constraints ;
- rangée durées : même style, `aria-label="Filtrer par durée"`, options « Toutes » (`null`), « ≤ 20 min » (20), « ≤ 30 min » (30), « ≤ 45 min » (45) ;
- compteur au-dessus de la liste : `{visibles.length} recette(s)`.

- [ ] **Step 3: Sortie de secours**

Si `visibles.length === 0` : afficher « Aucune recette ne correspond. » puis un bouton « Réinitialiser les filtres » (`className="bouton-secondaire mt-2 min-h-11"`) qui remet `requete`, `categorieFiltre` et `dureeMax` à leurs valeurs par défaut. La sélection courante (`recetteChoisie`) et les flux ajout/modification/suppression restent inchangés.

- [ ] **Step 4: Vérifier**

Run: `npm run build` → vert.
Contrôle manuel (après déploiement, 360 px) : `/plan` → ouvrir une case vide → taper « Poisson » → seules les recettes de poisson ; changer la durée → filtres combinés ; vider la recherche + forcer 0 résultat → le bouton réinitialise la liste ; aucun débordement de page, chips défilantes.

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add "src/app/(app)/plan/page.tsx" src/components/plan/grille.tsx src/components/plan/feuille-repas.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add category and duration filters to meal picker"
```

---

### Task 7: Page Recettes — chips catégorie et catégorie sur les cartes

**Files:**
- Modify: `src/app/(app)/recettes/page.tsx:12-46`
- Modify: `src/components/recettes/recettes-client.tsx:12-58,60-127`
- Modify: `src/components/recettes/recette-card.tsx:1-20`
- Modify: `src/components/recettes/feuille-recette.tsx:7-15`

**Interfaces:**
- Consumes: `filtrerRecettes` avec `categorieId` (Task 3), `CategorieVue` (Task 2), relation `Recipe.categorie` (Task 1).
- Produces: `RecetteVue`/`RecetteFiche` gagnent `categorieId: string | null` et `categorieNom: string | null` ; `RecettesClient` reçoit `categories: CategorieVue[]`.

- [ ] **Step 1: Charger les catégories et les noms**

`recettes/page.tsx` : lire recettes (`include: { categorie: { select: { nom: true } } }`) et catégories visibles en parallèle, trier les catégories en français, mapper chaque recette avec `categorieId: r.categorieId` et `categorieNom: r.categorie?.nom ?? null`. Passer `categories` à `RecettesClient`.

- [ ] **Step 2: Ajouter la rangée de chips**

`recettes-client.tsx` : état `categorieFiltre: string | null` ; rangée « Toutes » + catégories avec les mêmes classes/aria que la feuille de repas (`aria-label="Filtrer par catégorie"`, `min-h-11`), placée au-dessus des tags ; ajouter `categorieId: categorieFiltre` à l'appel `filtrerRecettes` ; `reinitialiser` remet aussi `categorieFiltre` à `null`.

- [ ] **Step 3: Afficher la catégorie sur les cartes**

`RecetteFiche` et `RecetteVue` gagnent les deux champs. `RecetteCard` : ajouter `categorieNom?: string | null` à son type et, dans la ligne méta, suffixer ` · {categorieNom}` quand il existe (après les minutes). Passer `categorieNom={r.categorieNom}` depuis `RecettesClient`.

- [ ] **Step 4: Vérifier**

Run: `npm run build` → vert.
Contrôle manuel : `/recettes` → chip « Poisson » → seules les recettes de poisson ; tag + catégorie + durée se combinent ; « Réinitialiser les filtres » efface catégorie, tags, durée, texte et tri ; une carte affiche « 2 portions · 30 min · Poisson ».

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add "src/app/(app)/recettes/page.tsx" src/components/recettes/recettes-client.tsx src/components/recettes/recette-card.tsx src/components/recettes/feuille-recette.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add category filter and label to recipes page"
```

---

### Task 8: Vérification finale et déploiement

**Files:** aucun (gate uniquement)

- [ ] **Step 1: Suite complète**

Run: `npm test`
Expected: tous les fichiers verts, nombre de tests ≥ 77 (70 + 4 catégories + 3 filtre).

- [ ] **Step 2: Build de production**

Run: `npm run build` (timeout ≥ 600000 ms)
Expected: vert, routes `/api/categories` et pages `/plan`, `/recettes`, `/recettes/nouvelle` compilées.

- [ ] **Step 3: Vérifier l'absence de régression de forme**

Run: `"C:\Program Files\Git\cmd\git.exe" diff --stat 14e4408..HEAD`
Expected: uniquement les fichiers des Tasks 1–7 + la migration ; aucune dépendance ajoutée dans `package.json`.

- [ ] **Step 4: Pousser**

Run: `"C:\Program Files\Git\cmd\git.exe" push origin main`
Expected: Vercel redéploie. Vérifier ensuite sur téléphone les cinq critères de réussite de la spec :
1. `/plan` → taper une case → « Poisson » ne montre que les recettes de poisson.
2. Créer « Tajines » depuis le formulaire → immédiatement disponible dans le filtre du planning.
3. Une ancienne recette apparaît dans « Autre ».
4. Aucun débordement horizontal à 360 px ; chips et boutons ≥ 44 px.
5. La création d'une catégorie existante ne crée pas de doublon.

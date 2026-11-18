# Liste de courses vivante — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La liste de courses se met à jour automatiquement à chaque mutation du planning (création/modification/suppression d'un repas, édition/suppression d'une recette) et devient pleinement interactive (ajout manuel, édition de quantité, suppression/masquage de ligne).

**Architecture:** La liste reste une table persistée mais devient une **projection sourcée** du planning : chaque ligne porte `source` (PLAN/MANUEL). Une fonction pure `reconcilerListe` calcule le diff (créer/mettre à jour/supprimer) entre les lignes en base et la projection de la semaine (via `aggregateGroceries` existant). Un module serveur `synchroniserCourses` applique ce diff **dans la même transaction Prisma** que chaque mutation concernante — la liste ne peut jamais mentir sur le planning.

**Tech Stack:** Next.js 15 App Router, Prisma 6 (Neon), TypeScript, Tailwind v4, Vitest. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-17-liste-courses-vivante-design.md`

## Global Constraints

- Zéro nouvelle dépendance npm.
- TDD sur la logique pure (Vitest) : le test est écrit avant l'implémentation, échec vérifié, puis passage.
- `npm test` (61+ tests verts) ET `npm run build` verts avant **chaque** commit.
- Mobile 360 px : cibles tactiles ≥ 44 px, safe-area, aucun débordement de page (seule la grille hebdo peut scroller horizontalement).
- UI française, classes sémantiques des thèmes (`.carte`, `.bouton`, `.bouton-secondaire`, `.champ`, `.puce`), police Fredoka.
- Animations : propriétés transform/opacity uniquement ; `prefers-reduced-motion` coupe tout.
- Windows/PowerShell : toute édition bulk de fichier passe par `[System.IO.File]::ReadAllText/WriteAllText` (jamais Get-Content/Set-Content qui corrompent l'UTF-8).
- Git : `"C:\Program Files\Git\cmd\git.exe"` (git absent du PATH).

## Review Focus

1. **Ingrédient partagé entre deux repas, un repas supprimé** → la ligne décrémente, puis disparaît seulement quand plus aucun repas ne la nécessite. Test : `reconcilerListe` « supprime uniquement les clés disparues de la projection » (Task 1).
2. **Déplacement d'un repas (changement de date)** → l'ancienne semaine ET la nouvelle resynchronisées ; la ligne est déplacée, jamais dupliquée ni perdue. Pin : revue de la logique PATCH `[id]` (Task 3) — pas de test unitaire route dans ce projet.
3. **Recette éditée utilisée dans plusieurs semaines** → toutes les listes concernées suivent (distincts des `weekStart`). Pin : revue de la logique recipes PATCH/DELETE (Task 4).
4. **Ajout manuel en collision avec un article masqué** → conversion en ligne manuelle, jamais d'erreur 500 (la contrainte unique est gérée au niveau applicatif). Pin : revue de `POST /api/courses/item` (Task 5) + test bouclier du reconciler (Task 1).
5. **Cochage conservé quand la quantité change** → le plan de mise à jour ne contient jamais `checked`. Test : `reconcilerListe` « aMettreAJour ne touche pas checked/masquee » (Task 1).

---

### Task 1: Reconciler pur (TDD)

**Files:**
- Create: `src/lib/reconciliation-courses.ts`
- Test: `src/lib/reconciliation-courses.test.ts`

**Interfaces:**
- Consumes: rien (pur).
- Produces (Tasks 2+):
  ```ts
  export type SourceLigne = "PLAN" | "MANUEL";
  export type LigneExistante = {
    id: string; nom: string; quantite: number | null; unite: string | null;
    rayon: string; checked: boolean; masquee: boolean; source: SourceLigne;
  };
  export type LigneProjetee = { nom: string; quantite: number | null; unite: string | null; rayon: string };
  export type PlanReconciliation = {
    aCreer: LigneProjetee[];
    aMettreAJour: { id: string; quantite: number | null; rayon: string }[];
    aSupprimer: string[]; // ids
  };
  export function reconcilerListe(existantes: LigneExistante[], projection: LigneProjetee[]): PlanReconciliation;
  ```
  Clé de fusion : `` `${nom.trim().toLowerCase()}|${unite ?? ""}` `` (convention identique à `aggregateGroceries` et aux routes existantes).

- [ ] **Step 1: Write the failing test** — `src/lib/reconciliation-courses.test.ts`, tests nommés (assertions exactes) :
  - « crée les clés absentes de la base » : projection `[{nom:"Carottes", quantite:400, unite:"g", rayon:"Legumes"}]`, base vide → `aCreer` contient 1 ligne, `aMettreAJour` et `aSupprimer` vides.
  - « met à jour quantité et rayon d'une ligne PLAN existante, sans toucher checked/masquee » : base `[{id:"a", nom:"carottes", quantite:200, unite:"g", rayon:"Legumes", checked:true, masquee:false, source:"PLAN"}]`, projection 400 g → `aMettreAJour` = `[{id:"a", quantite:400, rayon:"Legumes"}]` (objet **exactement** ces 3 clés — pin du Review Focus 5).
  - « supprime les lignes PLAN dont la clé a disparu (masquée ou non) » : base avec ids `b` (visible) et `c` (masquée), projection sans ces clés → `aSupprimer` = `["b","c"]`.
  - « ligne PLAN masquée toujours projetée → mise à jour, pas de suppression ».
  - « bouclier : une ligne MANUELLE couvre sa clé » : base MANUELLE `[{id:"m", nom:"sucre", quantite:100, unite:"g", ...}]`, projection contient `sucre|g` 500 g → `aCreer` vide, `aMettreAJour` vide, `aSupprimer` vide.
  - « décrémente puis purge un ingrédient partagé » (Review Focus 1) : projection recalculée 200 g puis 0 (clé absente) → d'abord `aMettreAJour` 200, puis `aSupprimer`.
  - « quantité null (pincée) : null vers null inchangé, null vers valeur mise à jour ».
  - « casse : "Carotte" en base, "carotte" projeté → même clé, mise à jour, nom de la base inchangé ».
  - « lignes MANUELLES jamais dans aSupprimer ni aMettreAJour, même clé absente de la projection ».

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx vitest run src/lib/reconciliation-courses.test.ts`
  Expected: FAIL (module introuvable).

- [ ] **Step 3: Implement `reconcilerListe`** in `src/lib/reconciliation-courses.ts`
  Approche : deux Maps par clé (existantes PLAN / existantes MANUELLES), une passe sur la projection (update ou create, sauf clé bouclée), une passe sur les PLAN restantes (clé absente → delete). Pure, aucun import.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx vitest run src/lib/reconciliation-courses.test.ts`
  Expected: PASS (tous les tests du fichier).

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/reconciliation-courses.ts src/lib/reconciliation-courses.test.ts
  git commit -m "feat: pure grocery list reconciler (TDD)"
  ```

### Task 2: Schéma sourcé + sync serveur

**Files:**
- Modify: `prisma/schema.prisma` (model GroceryListItem)
- Create: `prisma/migrations/<horodatage>_courses_vivantes/migration.sql` (via `npx prisma migrate dev --name courses_vivantes`)
- Create: `src/lib/sync-courses.ts`

**Interfaces:**
- Consumes: `reconcilerListe` (Task 1), `aggregateGroceries` + `EntreePlanAvecRecette` + `GroupeRayon` de `src/lib/courses.ts`, `weekStart` de `src/lib/plan.ts`.
- Produces (Tasks 3-5):
  ```ts
  import type { Prisma } from "@prisma/client";
  export async function synchroniserCourses(
    tx: Prisma.TransactionClient, ownerId: string, dates: Date[]
  ): Promise<void>;
  ```
  Normalise chaque date en début de semaine (lundi UTC) via `weekStart`, déduplique, puis par semaine : charge les repas (`mealPlanEntry.findMany` avec `include: { recipe: { select: { servings: true, ingredients: true } } }`), projette via `aggregateGroceries` (groupes aplatis en `LigneProjetee`), charge les lignes existantes (`groceryListItem.findMany`), réconcilie, applique `createMany` / `update` / `deleteMany({ id: { in: aSupprimer } })`. Les champs `source`/`masquee`/`checked` des mises à jour ne sont **jamais** écrits.

- [ ] **Step 1: Modify schema** — dans `model GroceryListItem`, ajouter :
  ```prisma
  source  GroceryItemSource @default(PLAN)
  masquee Boolean          @default(false)
  ```
  et l'enum :
  ```prisma
  enum GroceryItemSource {
    PLAN
    MANUEL
  }
  ```

- [ ] **Step 2: Generate and apply the migration**
  Run: `npx prisma migrate dev --name courses_vivantes`
  Expected: migration appliquée, client régénéré. (`npm test` reste vert — aucune régression.)

- [ ] **Step 3: Implement `synchroniserCourses`** in `src/lib/sync-courses.ts`
  Pas de test unitaire (logique DB, pattern projet) : la pureté est dans Task 1. Signatures et règles ci-dessus, exactes.

- [ ] **Step 4: Verify suite + build**
  Run: `npm test` puis `npm run build`
  Expected: suite verte, build vert (le client régénéré type-check).

- [ ] **Step 5: Commit**
  ```bash
  git add prisma/schema.prisma prisma/migrations src/lib/sync-courses.ts
  git commit -m "feat: grocery source+masquee schema and server-side week sync"
  ```

### Task 3: Branchement planning (+ suppression du DELETE mort)

**Files:**
- Modify: `src/app/api/plan/route.ts` (POST → transaction+sync ; DELETE par query params → **supprimé**)
- Modify: `src/app/api/plan/[id]/route.ts` (PATCH et DELETE → transaction+sync)

**Interfaces:**
- Consumes: `synchroniserCourses` (Task 2).
- Produces: comportement — toute mutation planning laisse la liste de la/les semaine(s) cohérente ; plus aucun endpoint de suppression alternatif.

- [ ] **Step 1: POST /api/plan** — conserver validations et 409 existants ; envelopper la création :
  ```ts
  const entry = await db.$transaction(async (tx) => {
    const created = await tx.mealPlanEntry.create({ ... });
    await synchroniserCourses(tx, userId, [created.date]);
    return created;
  });
  ```

- [ ] **Step 2: PATCH /api/plan/[id]** — capturer `existante.date` **avant** l'update ; envelopper l'update + `synchroniserCourses(tx, userId, [existante.date, data.date ?? existante.date])` (les deux semaines si la date a changé — Review Focus 2). Conserver la validation 409 sur case occupée.

- [ ] **Step 3: DELETE /api/plan/[id]** — envelopper le delete + `synchroniserCourses(tx, userId, [existante.date])` (existante déjà chargée pour le check propriétaire).

- [ ] **Step 4: Supprimer le handler `DELETE` par query params** de `src/app/api/plan/route.ts` (dead code, plus appelé par aucune interface — voir spec, section Déclencheurs).

- [ ] **Step 5: Verify + commit**
  Run: `npm test` puis `npm run build` — verts attendus.
  ```bash
  git add src/app/api/plan/route.ts "src/app/api/plan/[id]/route.ts"
  git commit -m "feat: auto grocery sync on plan mutations (drop dead query DELETE)"
  ```

### Task 4: Branchement recettes

**Files:**
- Modify: `src/app/api/recipes/[id]/route.ts`

**Interfaces:**
- Consumes: `synchroniserCourses` (Task 2).
- Produces: l'édition (ingrédients/portions) ou la suppression d'une recette resynchronise toutes les semaines qui l'utilisent.

- [ ] **Step 1: PATCH** — si `parsed.data` contient `ingredients` ou `servings` : dans la transaction, après l'update, collecter les semaines concernées :
  ```ts
  const entrees = await tx.mealPlanEntry.findMany({
    where: { recipeId: id }, select: { date: true },
  });
  await synchroniserCourses(tx, userId, entrees.map((e) => e.date));
  ```
  (Tous les repas d'une recette appartiennent à son créateur : `POST /api/plan` vérifie déjà `createdById === userId`.) Review Focus 3.

- [ ] **Step 2: DELETE** — collecter `entrees` **avant** `db.recipe.delete` (cascade), puis dans la même transaction `synchroniserCourses(tx, userId, dates)` après le delete.

- [ ] **Step 3: Verify + commit**
  Run: `npm test` puis `npm run build` — verts attendus.
  ```bash
  git add "src/app/api/recipes/[id]/route.ts"
  git commit -m "feat: grocery sync on recipe edits and deletes"
  ```

### Task 5: API courses interactive

**Files:**
- Create: `src/app/api/courses/item/route.ts`
- Modify: `src/app/api/courses/[id]/route.ts`

**Interfaces:**
- Consumes: `mapToRayon`, `RAYONS` de `src/lib/rayons.ts` (via `src/lib/courses.ts`).
- Produces:
  - `POST /api/courses/item` — body `{ weekStart, nom, quantite?, unite?, rayon? }`. Validations : weekStart `YYYY-MM-DD`, `nom` non vide (trim, ≤ 60 car.), `quantite` nombre > 0 ou absent, `unite` ≤ 20 car., `rayon` ∈ RAYONS sinon `mapToRayon(nom)`. Collision (clé bascule sur les lignes de la semaine) : ligne **visible** → 409 `{"error": "Déjà dans la liste pour cette semaine"}` ; ligne PLAN **masquée** → **conversion** (update : `source: "MANUEL"`, quantite/unite/rayon de l'appel, `masquee: false`, `checked: false`) → 201. Sinon createMany-like create → 201. Catch P2002 → 409.
  - `PATCH /api/courses/[id]` — body partiel `{ checked?, quantite?, nom?, unite?, rayon?, masquee? }`. `checked`/`masquee` booléens ; `quantite` nombre > 0 ou `null` explicite ; `nom`/`unite`/`rayon` **uniquement** si `source === "MANUEL"` sinon 400 `{"error": "Article du planning — seule la quantité est modifiable"}`.
  - `DELETE /api/courses/[id]` — MANUELLE → delete, JSON `{ traitement: "supprimee" }` ; PLAN → update `masquee: true`, JSON `{ traitement: "masquee" }`.

- [ ] **Step 1: Implement `POST /api/courses/item`** (auth obligatoire, item rattaché à `ownerId = userId`, `weekStart = new Date(weekStart)`).
- [ ] **Step 2: Implement PATCH/DELETE étendus** dans `[id]/route.ts` (findUnique + check `ownerId` → 404 sinon ; update par champs fournis seulement).
- [ ] **Step 3: Verify + commit**
  Run: `npm test` puis `npm run build` — verts attendus.
  ```bash
  git add src/app/api/courses
  git commit -m "feat: interactive grocery api (manual add, edit, hide/reveal)"
  ```

### Task 6: UI de la liste interactive

**Files:**
- Modify: `src/app/(app)/courses/page.tsx`
- Modify: `src/components/courses/liste.tsx`
- Create: `src/components/courses/formulaire-article.tsx`

**Interfaces:**
- Consumes: endpoints Task 5, `RAYONS`/`mapToRayon`/`formatQuantite` de `src/lib/courses.ts`.
- Produces: page courses à 4 capacités — cocher, éditer, supprimer/masquer, ajouter ; révélation des masquées.

- [ ] **Step 1: page.tsx** — passer aux items la forme riche `{ id, nom, quantite, unite, rayon, source, checked }` ; les lignes `masquee` sortent des groupes et vont dans un prop `masquees: MemeForme[]` + rien d'autre ne change (semaines, groupes, rayons ordonnés).
- [ ] **Step 2: liste.tsx** — par ligne : checkbox (existant), bouton ✎ (≥ 44 px) qui ouvre l'édition inline (champ quantité numérique ; si MANUELLE : nom, unité, rayon éditables ; sinon message « seule la quantité est modifiable »), bouton ✕ (≥ 44 px) qui appelle DELETE puis `router.refresh()` (le masquage PLAN est transparent : la ligne disparaît, le compteur masquées monte). Section bas de liste : « + Ajouter un article » (ouvre `FormulaireArticle`) et « N article(s) masqué(s) — afficher » qui déplie les masquées avec un bouton réafficher par ligne (`PATCH { masquee: false }`). Pattern existant conservé : fetch → `router.refresh()` + message d'état ; erreurs 409 affichées en clair français. **Chaque action attendue (générer, ajouter, éditer, supprimer, réafficher) affiche un état d'attente** : bouton désactivé + libellé en cours (« Ajout… », « Suppression… »), pattern de la connexion Google (2c). L'événement `emettre("course-cochee")` reste tel quel.
- [ ] **Step 3: formulaire-article.tsx** — champs : nom (requis), quantité (numérique), unité, rayon (`<select>` RAYONS, défaut `mapToRayon(nom)` au blur du nom). Submit → `POST /api/courses/item` ; 409 affiché en clair ; succès → refresh + fermeture.
- [ ] **Step 4: Verify + commit**
  Run: `npm test` puis `npm run build` — verts attendus.
  ```bash
  git add "src/app/(app)/courses/page.tsx" src/components/courses
  git commit -m "feat: interactive grocery list ui (add, edit, delete, reveal)"
  ```

### Task 7: États d'attente sur toutes les actions cliquables (pattern Google)

**Files:**
- Modify: les composants clients porteurs d'actions qui déclenchent un fetch/attente — candidats : `src/components/recettes/feuille-recette.tsx` (suppression), `src/components/plan/feuille-repas.tsx` (ajout/move/suppression), le formulaire de création de recette (`src/app/(app)/recettes/nouvelle`), tout autre bouton déclenchant un `fetch` trouvé à l'audit. Déjà conformes (ne pas retoucher sauf trou) : `liste.tsx` (Task 6), `cles-client.tsx` (`enCours` existant), connexion Google (2c).

**Interfaces:**
- Consumes: pattern pending établi (bouton désactivé + libellé « … » / état `enCours`, éventuellement `ChargementMiamz` de `src/components/miamz/chargement.tsx`).
- Produces: aucun appel cliquable sans retour visuel pendant l'attente.

- [ ] **Step 1: Audit** — `grep` des `fetch(` et submits de formulaires dans `src/components` et pages clientes ; lister chaque bouton déclencheur et s'il a déjà un état d'attente. L'audit va dans le rapport.
- [ ] **Step 2: Appliquer le pattern** — pour chaque bouton trouvé sans retour : état local `enCours`, désactivation du/des boutons concernés, libellé en cours, réactivation/rollback en `finally` (erreurs affichées en clair français, pattern 409 existant).
- [ ] **Step 3: Verify + commit**
  Run: `npm test` puis `npm run build` — verts attendus.
  ```bash
  git add -A src/components src/app
  git commit -m "feat: pending feedback on all awaiting click actions (google pattern)"
  ```

### Task 8: Installation PWA plein écran (manifeste + icônes)

**Files:**
- Create: `src/app/manifest.ts` (MetadataRoute.Manifest)
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png` (180 px)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: types Next.js `MetadataRoute`, `Viewport`.
- Produces: app installée sur l'écran d'accueil (Android/iOS) qui s'ouvre en `display: standalone` — **sans barre d'URL** (demande Steve du 18/11).

- [ ] **Step 1: `src/app/manifest.ts`** — `name: "Miamz"`, `short_name: "Miamz"`, `start_url: "/"`, `display: "standalone"`, `background_color: "#FFF9E6"`, `theme_color: "#4A6741"`, `lang: "fr"`, `icons` : 192 et 512 (`purpose: ["any"]`) + 512 en `maskable`.
- [ ] **Step 2: Icônes PNG** — générer les 3 PNG depuis un petit script Node **jetable** (uniquement `zlib`, zéro dépendance ; le script reste dans le workspace SDD, seuls les PNG sont committés) : onigiri kawaii simple et net (fond crème arrondi, triangle vert clair, yeux manga, sourire) aux tailles 192, 512 et 180 (apple).
- [ ] **Step 3: layout.tsx** — `export const viewport: Viewport = { themeColor: "#4A6741" }` + dans `metadata` : `appleWebApp: { capable: true, statusBarStyle: "default", title: "Miamz" }`. Vérifier que `src/app/icon.svg` existant n'entre pas en conflit d'icônes.
- [ ] **Step 4: Verify** — `npm run build` vert ; le manifeste `manifest.webmanifest` est bien émis (inspecter la sortie de build) ; `npm test` vert.
- [ ] **Step 5: Commit**
  ```bash
  git add src/app/manifest.ts src/app/layout.tsx public/icons
  git commit -m "feat: pwa standalone launch (manifest + icons)"
  ```
- Note de validation Steve : réinstaller le raccourci sur l'écran d'accueil (supprimer l'ancien) pour que le nouveau manifeste s'applique.

### Task 9: Vérification finale et push

**Files:** aucun (vérification seule).

- [ ] **Step 1: Suite complète** — Run: `npm test` — Expected: tous les tests verts (61 existants + reconciler).
- [ ] **Step 2: Build** — Run: `npm run build` — Expected: vert.
- [ ] **Step 3: Revue de branche** — subagent de revue sur `v0.3.0-themes..HEAD` (pattern des plans précédents), correctifs éventuels committés.
- [ ] **Step 4: Push** — `git push origin main` (déploiement Vercel automatique, client Prisma régénéré par le build depuis le correctif 08629e8).
- [ ] **Step 5: Validation Steve sur téléphone** (critères de réussite de la spec) — hors plan, attendu de lui.

# Boutique communautaire + Jetons + Validation — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une boutique communautaire où les utilisateurs publient leurs recettes, la communauté les valide (3 validations = badge), les validateurs gagnent des jetons (max 10, réputation + monnaie future), et les recettes validées deviennent accessibles en lecture seule via « Ajouter à mes recettes ».

**Architecture:** Migration additive Prisma (nouveaux champs Recipe + User, tables Report + TokenTransaction) → API REST pour publier/valider/partager/signaler → page `/boutique` + modales intégrées aux pages existantes → composants partagés (FeuilleModale, hooks). Pas de nouvelle dépendance.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6 (Neon), Tailwind v4, Vitest. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-24-boutique-communautaire-design.md` (validée 2026-11-24).

---

## Contraintes globales

- UI entièrement en français, ton tutoiement, Fredoka.
- Mobile d'abord : cibles ≥ 44 px (`min-h-11`), aucun débordement horizontal de page à 360 px. Seules les grilles/rangées de chips défilent.
- Zéro nouvelle dépendance npm.
- Animations `transform`/`opacity` seulement, respect de `prefers-reduced-motion`.
- Toute action qui attend affiche un retour visuel (bouton désactivé + libellé d'attente).
- Dates en UTC via `weekStart` / `formatDateIso` (`src/lib/plan.ts`).
- TDD sur la logique pure (Vitest). Pas de tests de routes ni de pages.
- `npm test` et `npm run build` verts avant chaque commit. Build : timeout ≥ 600000 ms.
- Git hors PATH : `"C:\Program Files\Git\cmd\git.exe"`.
- Migration additive seulement — aucun reset.

## Carte des fichiers

```
prisma/schema.prisma                           Recipe + User + Report + TokenTransaction (modifié)
prisma/migrations/<ts>_add_boutique/           migration SQL (créée)

src/lib/boutique.ts                            logique pure jetons/validation (créé, TDD)
tests/boutique.test.ts                         tests TDD (créé)

src/app/api/recipes/[id]/publish/route.ts      POST publier/retirer (créé)
src/app/api/recipes/[id]/validate/route.ts     POST valider (créé)
src/app/api/recipes/[id]/share/route.ts        POST partager (copie lecture seule) (créé)
src/app/api/recipes/[id]/report/route.ts       POST signaler (créé)
src/app/api/boutique/route.ts                  GET liste validées (créé)

src/components/recettes/recette-card.tsx       badges + boutons publier/valider/partager/signaler (modifié)
src/components/recettes/feuille-recette.tsx    bouton publier/retirer pour l'auteur (modifié)
src/components/boutique/boutique-page.tsx      page /boutique grille + recherche/filtres (créé)
src/components/boutique/boutique-client.tsx    client interactif recherche/filtres/pagination (créé)
src/app/boutique/page.tsx                      page serveur /boutique (créé)

src/app/(app)/recettes/page.tsx                select isPublic/validatedAt/validationCount (modifié)
src/components/recettes/recettes-client.tsx    badge validée + bouton partager (modifié)

src/app/admin/layout.tsx                       onglet Signalements (modifié)
src/app/admin/signalements/page.tsx            page signalements admin (créé)
src/components/admin/signalements-client.tsx   liste signalements + actions (créé)

src/app/api/admin/reports/route.ts             GET signalements (créé)
src/app/api/admin/reports/[id]/route.ts        PATCH/DELETE actions admin (créé)

tests/boutique.test.ts                         logique pure (créé)
```

Ordre : migration → logique pure (TDD) → API → composants recettes → page boutique → composants admin → page recettes → gate final.

---

## Review Focus

1. **Auto-validation** : utilisateur tente de valider sa propre recette → 403, aucun jeton. Test : `boutique.test.ts` (Task 1) + API validate (Task 3).
2. **Plafond jetons** : validateur à 10 jetons valide une 4ème recette → validation comptée, 0 jeton. Test : `boutique.test.ts` (Task 1).
3. **Partage lecture seule** : utilisateur ajoute recette validée → copie créée avec `editable=false`, tentative modification → 403. Test : API share (Task 4) + guards UI.
4. **Validation course** : deux validations simultanées 2→3 → seule la première passe à 3, badge attribué une seule fois. Test : API validate transaction (Task 3).
5. **Signalement auteur** : auteur signale sa propre recette → 403. Test : API report (Task 5).

---

### Task 1: Migration Prisma + logique pure jetons/validation (TDD)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_boutique/migration.sql`
- Create: `src/lib/boutique.ts`
- Test: `tests/boutique.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces (Tasks 2–8) :
  ```ts
  // Prisma: nouveaux champs Recipe, User, modèles Report, TokenTransaction
  // src/lib/boutique.ts:
  export const MAX_TOKENS = 10;
  export const VALIDATIONS_FOR_BADGE = 3;

  export function peutValider(recipe: { validationCount: number; validators: string[]; authorId: string }, userId: string): boolean;
  export function calculerJetonsApresValidation(currentTokens: number): number; // min(current + 1, MAX_TOKENS)
  export function estValidee(validationCount: number): boolean; // >= VALIDATIONS_FOR_BADGE
  export function peutPartager(recipe: { validatedAt: Date | null }): boolean;
  ```

- [ ] **Step 1: Modifier le schéma Prisma**

Dans `prisma/schema.prisma`, model `Recipe` ajouter :
```prisma
isPublic        Boolean   @default(false)
publishedAt     DateTime?
validatedAt     DateTime?
validationCount Int       @default(0)
validators      String[]  // user IDs ayant validé
sharedWith      String[]  // user IDs ayant ajouté à leurs recettes
reports         Report[]
```

Model `User` ajouter :
```prisma
tokens          Int       @default(0)
validatedRecipes String[] // recipe IDs validées
sharedRecipes   String[]  // recipe IDs partagées
tokenTransactions TokenTransaction[]
```

Nouveaux modèles :
```prisma
model Report {
  id        String       @id @default(cuid())
  recipeId  String
  recipe    Recipe       @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  reporterId String
  reporter  User         @relation(fields: [reporterId], references: [id], onDelete: Cascade)
  reason    String       // "spam" | "inapproprié" | "autre"
  detail    String?
  status    ReportStatus @default(PENDING)
  createdAt DateTime     @default(now())
}

model TokenTransaction {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  amount    Int      // +1 pour validation, -X pour achats futurs
  reason    String   // "validation" | "achat" | "bonus"
  recipeId  String?  // recette concernée
  createdAt DateTime @default(now())
}

enum ReportStatus {
  PENDING
  REVIEWED
  DISMISSED
}
```

- [ ] **Step 2: Générer la migration sans l'appliquer**

Run: `npx prisma migrate dev --create-only --name add_boutique`

- [ ] **Step 3: Compléter la migration SQL** (backfill tokens=0, validationCount=0, isPublic=false)

- [ ] **Step 4: Appliquer la migration** : `npx prisma migrate dev`

- [ ] **Step 5: Écrire les tests TDD** `tests/boutique.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { peutValider, calculerJetonsApresValidation, estValidee, peutPartager, MAX_TOKENS, VALIDATIONS_FOR_BADGE } from "@/lib/boutique";

describe("boutique logic", () => {
  it("peutValider: true si recette publique, pas auteur, pas déjà validé", () => {
    expect(peutValider({ validationCount: 0, validators: [], authorId: "u1" }, "u2")).toBe(true);
  });
  it("peutValider: false si auteur", () => {
    expect(peutValider({ validationCount: 0, validators: [], authorId: "u1" }, "u1")).toBe(false);
  });
  it("peutValider: false si déjà validé par cet user", () => {
    expect(peutValider({ validationCount: 1, validators: ["u2"], authorId: "u1" }, "u2")).toBe(false);
  });
  it("peutValider: false si pas publique (validationCount = -1 convention)", () => {
    expect(peutValider({ validationCount: -1, validators: [], authorId: "u1" }, "u2")).toBe(false);
  });

  it("calculerJetonsApresValidation: +1 si < MAX_TOKENS", () => {
    expect(calculerJetonsApresValidation(0)).toBe(1);
    expect(calculerJetonsApresValidation(5)).toBe(6);
    expect(calculerJetonsApresValidation(9)).toBe(10);
  });
  it("calculerJetonsApresValidation: max 10", () => {
    expect(calculerJetonsApresValidation(10)).toBe(10);
    expect(calculerJetonsApresValidation(15)).toBe(10);
  });

  it("estValidee: true >= 3", () => {
    expect(estValidee(2)).toBe(false);
    expect(estValidee(3)).toBe(true);
    expect(estValidee(5)).toBe(true);
  });

  it("peutPartager: true seulement si validatedAt non null", () => {
    expect(peutPartager({ validatedAt: new Date() })).toBe(true);
    expect(peutPartager({ validatedAt: null })).toBe(false);
  });
});
```

- [ ] **Step 6: Implémenter `src/lib/boutique.ts`**

```ts
export const MAX_TOKENS = 10;
export const VALIDATIONS_FOR_BADGE = 3;

export type RecipeForValidation = {
  validationCount: number;
  validators: string[];
  authorId: string;
};

export function peutValider(recipe: RecipeForValidation, userId: string): boolean {
  if (recipe.validationCount < 0) return false; // pas publique
  if (recipe.authorId === userId) return false;
  if (recipe.validators.includes(userId)) return false;
  return true;
}

export function calculerJetonsApresValidation(currentTokens: number): number {
  return Math.min(currentTokens + 1, MAX_TOKENS);
}

export function estValidee(validationCount: number): boolean {
  return validationCount >= VALIDATIONS_FOR_BADGE;
}

export function peutPartager(recipe: { validatedAt: Date | null }): boolean {
  return recipe.validatedAt !== null;
}
```

- [ ] **Step 7: Vérifier tests + build + commit**

Run: `npm test` → 147+ tests verts. `npm run build` → vert.

```powershell
"C:\Program Files\Git\cmd\git.exe" add prisma/schema.prisma prisma/migrations src/lib/boutique.ts tests/boutique.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add boutique models and validation/token logic"
```

---

### Task 2: API Recettes — Publier / Retirer

**Files:**
- Create: `src/app/api/recipes/[id]/publish/route.ts`

**Interfaces:**
- Consumes: `prisma.Recipe` (Task 1), `exigerAuteur()` helper.
- Produces (Task 4) : `POST /api/recipes/[id]/publish` body `{ publish: boolean }`.

- [ ] **Step 1: Helper `exigerAuteur(recipeId, userId)`** dans `src/lib/recipes.ts` (existant ou nouveau)

- [ ] **Step 2: Créer la route**

```ts
// POST /api/recipes/[id]/publish
// Body: { publish: boolean }
// Si publish=true: isPublic=true, publishedAt=now, validationCount=0, validators=[]
// Si publish=false: isPublic=false, publishedAt=null, validatedAt=null, validationCount=0, validators=[], sharedWith=[]
// 403 si pas l'auteur, 404 si introuvable
```

- [ ] **Step 3: Tests manuels + build + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/api/recipes/[id]/publish/route.ts src/lib/recipes.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add recipe publish/unpublish API"
```

---

### Task 3: API Recettes — Valider

**Files:**
- Create: `src/app/api/recipes/[id]/validate/route.ts`

**Interfaces:**
- Consumes: `peutValider`, `calculerJetonsApresValidation` (Task 1), Prisma transaction.
- Produces : `POST /api/recipes/[id]/validate` (auth requise).

- [ ] **Step 1: Créer la route**

```ts
// POST /api/recipes/[id]/validate
// Vérifs: recette publique, pas auteur, pas déjà validé par cet user
// Transaction: ajoute userId à validators, incrémente validationCount
// Si validationCount === 3: validatedAt = now
// Jetons: currentTokens < 10 → +1 token + TokenTransaction(reason="validation")
// 403: auteur / pas publique / déjà validé
// 409: déjà validé par cet user
```

- [ ] **Step 2: Vérifier + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/api/recipes/[id]/validate/route.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add recipe validation API with tokens"
```

---

### Task 4: API Recettes — Partager (copie lecture seule)

**Files:**
- Create: `src/app/api/recipes/[id]/share/route.ts`

**Interfaces:**
- Consumes: `peutPartager` (Task 1), logique copie lecture seule.
- Produces : `POST /api/recipes/[id]/share` (auth requise).

- [ ] **Step 1: Créer la route**

```ts
// POST /api/recipes/[id]/share
// Vérifs: recette validée (validatedAt non null), pas déjà partagée
// Crée copie lecture seule:
//   - nouvelle Recipe avec mêmes champs + isSharedCopy=true, sourceRecipeId=id, editable=false, ownerId=userId
//   - ajoute userId à sharedWith de la recette source
// 403 si pas validée, 409 si déjà partagée
```

- [ ] **Step 2: Guard modification** — dans `PATCH /api/recipes/[id]` bloquer si `editable=false` (403)

- [ ] **Step 3: Vérifier + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/api/recipes/[id]/share/route.ts src/app/api/recipes/[id]/route.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add recipe share (read-only copy) API"
```

---

### Task 5: API Recettes — Signaler + Boutique GET

**Files:**
- Create: `src/app/api/recipes/[id]/report/route.ts`
- Create: `src/app/api/boutique/route.ts`

**Interfaces:**
- Consumes: modèles Report, TokenTransaction.
- Produces : `POST /api/recipes/[id]/report`, `GET /api/boutique`.

- [ ] **Step 1: Route signaler**

```ts
// POST /api/recipes/[id]/report
// Body: { reason: "spam"|"inapproprié"|"autre", detail?: string }
// 403 si auteur, 404 si pas publique
// Crée Report { status: "PENDING" }
```

- [ ] **Step 2: Route boutique**

```ts
// GET /api/boutique?categorieId=&search=&page=1&limit=20
// Where: validatedAt != null (validée)
// Select: recette + auteur (nom, image)
// OrderBy: validationCount desc, publishedAt desc
// Pagination: skip/take
```

- [ ] **Step 3: Vérifier + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/api/recipes/[id]/report/route.ts src/app/api/boutique/route.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add report API and boutique listing"
```

---

### Task 6: Composants Recettes — Badges + Boutons

**Files:**
- Modify: `src/components/recettes/recette-card.tsx`
- Modify: `src/components/recettes/feuille-recette.tsx`

**Interfaces:**
- Consumes: `Recipe` avec nouveaux champs, `FeuilleModale`.
- Produces : UI badges « Validée », boutons Publier/Valider/Partager/Signaler.

- [ ] **Step 1: `recette-card.tsx`** — ajouter badges + boutons conditionnels
  - Si validée : badge « ✅ Validée par la communauté »
  - Si auteur & publique : bouton « Retirer » + badge « Publiée »
  - Si auteur & pas publique : bouton « Publier »
  - Si validée & pas auteur & pas déjà partagée : bouton « Ajouter à mes recettes »
  - Bouton « Signaler » (ouvre modale)

- [ ] **Step 2: `feuille-recette.tsx`** — bouton Publier/Retirer dans l'en-tête pour l'auteur

- [ ] **Step 3: Modales** — réutiliser `FeuilleModale` pour Publier/Valider/Partager/Signaler

- [ ] **Step 4: Vérifier + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/components/recettes/recette-card.tsx src/components/recettes/feuille-recette.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add boutique badges and actions to recipe cards"
```

---

### Task 7: Page Boutique — Grille + Recherche/Filtres

**Files:**
- Create: `src/app/boutique/page.tsx`
- Create: `src/components/boutique/boutique-client.tsx`
- Create: `src/components/boutique/boutique-page.tsx`

**Interfaces:**
- Consumes: `GET /api/boutique`, `CategorieVue`, `FeuilleModale`.
- Produces : page `/boutique` responsive.

- [ ] **Step 1: Page serveur** — `exigerSession()`, `GET /api/boutique` via fetch interne ou Prisma direct, passer données au client.

- [ ] **Step 2: Client** — recherche (titre/ingrédient), filtre catégorie, tri (validations/recent), pagination/infinite scroll, grille cartes.

- [ ] **Step 4: Vérifier + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/boutique src/components/boutique
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add boutique page with grid and filters"
```

---

### Task 8: Page Recettes — Badge Validée + Bouton Partager

**Files:**
- Modify: `src/app/(app)/recettes/page.tsx`
- Modify: `src/components/recettes/recettes-client.tsx`

**Interfaces:**
- Consumes: `isPublic`, `validatedAt`, `validationCount` (select Prisma).
- Produces : badge « Validée » dans la grille, bouton « Ajouter » sur carte.

- [ ] **Step 1: Select Prisma** — ajouter `isPublic`, `validatedAt`, `validationCount` au select.

- [ ] **Step 2: Client** — badge conditionnel, bouton partager si validée & pas auteur & pas déjà partagé.

- [ ] **Step 3: Vérifier + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/(app)/recettes/page.tsx src/components/recettes/recettes-client.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add validated badge and share button to recipes page"
```

---

### Task 9: Admin — Onglet Signalements

**Files:**
- Modify: `src/app/admin/layout.tsx` (ajouter onglet)
- Create: `src/app/admin/signalements/page.tsx`
- Create: `src/components/admin/signalements-client.tsx`
- Create: `src/app/api/admin/reports/route.ts`
- Create: `src/app/api/admin/reports/[id]/route.ts`

**Interfaces:**
- Consumes: modèles Report, `exigerAdmin`.
- Produites : onglet admin, liste + actions Fermer/Supprimer.

- [ ] **Step 1: Layout admin** — onglet « Signalements » dans `onglets-admin.tsx`.

- [ ] **Step 2: API admin** — GET liste (filtre status), PATCH `status=REVIEWED|DISMISSED`, DELETE (supprime recette + report).

- [ ] **Step 3: Page + client** — tableau/cartes signalements, actions.

- [ ] **Step 4: Vérifier + commit**

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/admin/layout.tsx src/app/admin/signalements src/components/admin/signalements-client.tsx src/app/api/admin/reports
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add admin reports management"
```

---

### Task 10: Gate final + Push

**Files:** aucun (gate uniquement).

- [ ] **Step 1: Suite complète** — `npm test` → ≥ 155 tests (147 + ~8 boutique).
- [ ] **Step 2: Build** — `npm run build` → vert.
- [ ] **Step 3: Périmètre** — `git diff --stat HEAD~10..HEAD -- src tests package.json prisma/schema.prisma` → uniquement fichiers plan.
- [ ] **Step 4: Push** — `git push origin main` → Vercel déploie.
- [ ] **Step 5: Vérif mobile 360px** — publier, valider, partager, signaler, boutique, admin signalements.

---

## Notes d'exécution

- **Migration** : additive, backfill `tokens=0`, `validationCount=0`, `isPublic=false`, `validators=[]`, `sharedWith=[]`.
- **Jetons** : max 10, +1 par validation si < 10, TokenTransaction pour audit.
- **Copie lecture seule** : `isSharedCopy`, `sourceRecipeId`, `editable=false` — guards API + UI.
- **Sync courses** : inchangée (copie partagée n'a pas d'ingrédients propres).
- **Zéro nouvelle dépendance** : SVG inline, `FeuilleModale` existante.
- **Prochaine étape** : IA Miamz partout (étendre le compagnon).
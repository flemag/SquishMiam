# Boutique enrichie — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrichir la boutique avec des articles (thèmes, accessoires Miamz, packs de recettes), gratuits ou payables en jetons, gérés par l'admin.

**Architecture:** Migration Prisma (`BoutiqueItem` + champs User) → logique pure testée → API admin CRUD + API achat → UI admin catalogue + UI boutique enrichie + application thème/accessoire sur le profil.

**Tech Stack:** Next.js 15 (App Router), Prisma, Vitest, Tailwind. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-24-boutique-enrichie-design.md`

## Global Constraints

- UI française, tutoiement.
- Mobile 360 px sans débordement ; cibles tactiles ≥ 44 px (`min-h-11`).
- Aucune nouvelle dépendance npm ; migration additive uniquement.
- `npm test` et `npm run build` verts avant chaque commit.
- Git hors PATH : `"C:\Program Files\Git\cmd\git.exe"`.

## Review Focus

- **Achat idempotent** : acheter deux fois le même article ne débite qu'une fois.
- **Solde insuffisant** : 403, pas d'achat.
- **Pack avec recette inexistante** : ignorée silencieusement.
- **Thème invalide (couleur mal formée)** : rejeté à la création.
- **Utilisateur non admin** : 403 sur toutes les routes admin.

---

### Task 1: Migration Prisma + logique pure

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/boutique-items.ts`
- Test: `tests/boutique-items.test.ts`

**Interfaces:**
- Produces:
  - `type TypeArticle = "theme" | "accessoire" | "pack"`
  - `validerArticle({ type, nom, prix, metadata }): { ok: true } | { ok: false; raison: string }`
  - `peutAcheter({ tokens, prix, dejaAchete }): boolean`
  - `metadonneesThemeValides(meta: unknown): boolean`

- [ ] **Step 1: Add schema fields**

Add to User: `purchasedItems String[] @default([])`, `activeTheme String?`, `activeAccessory String?`.
Add model `BoutiqueItem`: id, type (String), nom (String), description (String), prix (Int @default(0)), image (String?), metadata (Json), actif (Boolean @default(true)), createdAt.

- [ ] **Step 2: Create migration** — `npx prisma migrate dev --name add_boutique_items`.

- [ ] **Step 3: Write tests + implement pure logic**

`validerArticle` : type valide, nom non vide, prix ≥ 0, metadata selon le type.
`peutAcheter` : !dejaAchete && (prix === 0 || tokens >= prix).
`metadonneesThemeValides` : objet avec primary/secondary/accent/background/text (strings hex).

- [ ] **Step 4: Run tests** — `npx vitest run tests/boutique-items.test.ts` → PASS.

- [ ] **Step 5: Commit** — `git add prisma/schema.prisma prisma/migrations src/lib/boutique-items.ts tests/boutique-items.test.ts; git commit -m "feat: add boutique items schema and pure logic"`.

---

### Task 2: API admin CRUD

**Files:**
- Create: `src/app/api/admin/boutique/route.ts` (GET list + POST create)
- Create: `src/app/api/admin/boutique/[id]/route.ts` (PATCH update + DELETE)

**Interfaces:**
- Produces:
  - `GET /api/admin/boutique` → `{ articles: BoutiqueItemVue[] }`
  - `POST /api/admin/boutique` `{ type, nom, description, prix, image?, metadata }` → `{ ok, article }`
  - `PATCH /api/admin/boutique/[id]` `{ ... }` → `{ ok, article }`
  - `DELETE /api/admin/boutique/[id]` → `{ ok }`

- [ ] **Step 1: Implement GET + POST**

GET: admin check, list all items (actifs et inactifs), triés par createdAt desc.
POST: admin check, valider avec `validerArticle`, créer l'article.

- [ ] **Step 2: Implement PATCH + DELETE**

PATCH: admin check, valider, mettre à jour.
DELETE: admin check, supprimer (si aucun achat) ou désactiver (si achats).

- [ ] **Step 3: Verify build** — `npm run build` → vert.

- [ ] **Step 4: Commit** — `git add src/app/api/admin/boutique; git commit -m "feat: add admin boutique CRUD API"`.

---

### Task 3: API achat + application thème/accessoire

**Files:**
- Create: `src/app/api/boutique/acheter/route.ts`
- Create: `src/app/api/profil/theme/route.ts` (PATCH activeTheme/activeAccessory)

**Interfaces:**
- Produces:
  - `POST /api/boutique/acheter` `{ itemId }` → `{ ok, tokens }`
  - `PATCH /api/profil/theme` `{ theme?, accessoire? }` → `{ ok }`

- [ ] **Step 1: Implement purchase route**

Auth + item exists + actif. `peutAcheter` check. Transaction: débit tokens + TokenTransaction (reason "achat") + push itemId to purchasedItems. Si pack, copier les recettes du pack dans la cuisine de l'utilisateur.

- [ ] **Step 2: Implement theme route**

Auth. Vérifier que l'utilisateur possède l'article. Mettre à jour `activeTheme` / `activeAccessory`.

- [ ] **Step 3: Verify build** — `npm run build` → vert.

- [ ] **Step 4: Commit** — `git add src/app/api/boutique/acheter src/app/api/profil/theme; git commit -m "feat: add boutique purchase and theme application API"`.

---

### Task 4: UI admin catalogue

**Files:**
- Create: `src/app/admin/boutique-catalogue/page.tsx`
- Create: `src/components/admin/boutique-catalogue-client.tsx`
- Modify: `src/components/admin/onglets-admin.tsx` (add tab)

- [ ] **Step 1: Implement admin catalogue page + client**

Formulaire de création/modification (type, nom, description, prix, image URL, metadata JSON). Liste des articles avec actions (éditer, supprimer, activer/désactiver). Mobile : cartes empilées.

- [ ] **Step 2: Add nav tab** — `{ href: "/admin/boutique-catalogue", label: "Catalogue" }`.

- [ ] **Step 3: Verify build** — `npm run build` → vert.

- [ ] **Step 4: Commit** — `git add src/app/admin/boutique-catalogue src/components/admin/boutique-catalogue-client.tsx src/components/admin/onglets-admin.tsx; git commit -m "feat: add admin boutique catalogue tab"`.

---

### Task 5: UI boutique enrichie

**Files:**
- Modify: `src/components/boutique/boutique-page.tsx`
- Modify: `src/app/(app)/boutique/page.tsx`

**Interfaces:**
- Consumes: `GET /api/boutique` (items), `POST /api/boutique/acheter`.

- [ ] **Step 1: Add items to boutique page**

Charger les articles actifs depuis `/api/admin/boutique` ou une route publique `GET /api/boutique/items`. Afficher en grille avec badge prix (gratuit / X jetons), bouton « Acheter » / « Déjà possédé ».

- [ ] **Step 2: Wire purchase flow**

Achat → débit jetons → message de confirmation → refresh. Idempotence : bouton désactivé si déjà possédé.

- [ ] **Step 3: Verify build and tests** — `npm test` puis `npm run build` → verts.

- [ ] **Step 4: Commit** — `git add src/components/boutique/boutique-page.tsx src/app/(app)/boutique/page.tsx; git commit -m "feat: enrich boutique with items (themes, accessories, packs)"`.

---

### Task 6: Application thème/accessoire sur le profil

**Files:**
- Modify: `src/components/profil/profil-client.tsx`
- Modify: `src/app/(app)/profil/page.tsx`

- [ ] **Step 1: Add theme/accessory selector**

Sur le profil, section « Mon thème » et « Mon accessoire Miamz » avec sélecteur des articles achetés. Application via `PATCH /api/profil/theme`.

- [ ] **Step 2: Apply theme CSS variables**

Quand un thème est actif, injecter les couleurs en CSS variables sur le body.

- [ ] **Step 3: Verify build and tests** — `npm test` puis `npm run build` → verts.

- [ ] **Step 4: Commit** — `git add src/components/profil/profil-client.tsx src/app/(app)/profil/page.tsx; git commit -m "feat: apply theme and accessory on profile"`.

---

### Task 7: Gate final et déploiement

- [ ] **Step 1: Full suite** — `npm test` → verts.
- [ ] **Step 2: Production build** — `npm run build` → vert.
- [ ] **Step 3: Scope check** — `git diff --stat` → uniquement les fichiers des tâches 1-6.
- [ ] **Step 4: Push** — `git push origin main`.
- [ ] **Step 5: Ledger** — mettre à jour le progress.md.

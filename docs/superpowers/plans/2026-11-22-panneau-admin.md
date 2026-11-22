# Panneau admin riche & statistiques — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer `/admin/cles` en un vrai poste de pilotage : vue d'ensemble chiffrée, gestion des catégories (renommer, masquer, fusionner) et gestion des accès utilisateurs (rôle, prolongation, révocation), accessible depuis l'app pour le seul compte ADMIN.

**Architecture:** Un shell serveur `/admin/layout.tsx` avec onglets, une page serveur par section et des agrégats Prisma calculés à la volée. Les mutations passent par des routes `/api/admin/...` puis `router.refresh()`. Trois modules purs portent les décisions testables : regroupement hebdomadaire, renommage/fusion de catégories, clé d'accès courante et prolongation. Aucune migration, aucune dépendance, aucun cache.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6 (Neon), Tailwind v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-22-panneau-admin-design.md` (validée le 2026-11-22).

---

## Global Constraints

- UI entièrement en français, ton actuel de l'app (tutoiement).
- Mobile d'abord : cibles ≥ 44 px (`min-h-11`), aucun débordement horizontal de page à 360 px. Seules les rangées de chips/onglets défilent (`overflow-x-auto`).
- Zéro nouvelle dépendance npm. Graphiques en barres CSS uniquement.
- Animations `transform`/`opacity` seulement, respect de `prefers-reduced-motion` (aucune animation indispensable ici).
- Toute action qui attend affiche un retour : bouton désactivé + libellé d'attente (« Prolongation… », « Fusion… »).
- Dates et semaines en UTC via `weekStart` et `formatDateIso` (`src/lib/plan.ts`).
- TDD sur la logique pure. Pas de test de route ni de page (convention projet).
- `npm test` puis `npm run build` verts avant chaque commit. Build : timeout ≥ 600000 ms.
- Git hors PATH : `"C:\Program Files\Git\cmd\git.exe"`.
- Aucune migration Prisma, aucun changement de modèle de sous-agent.
- Détails de forme laissés au plan (pour éviter d'inventer) : cartes plutôt que tableaux, footer de modale = deux boutons `flex-1`, erreurs inline.

## Review Focus

1. **Nom de catégorie de plus de 60 caractères** (collé depuis un document) → refusé avant toute écriture, jamais de nom tronqué. Test : `decisionRenommage` (Task 3).
2. **Événement daté après la semaine courante** (horloge en avance, donnée aberrante) → ignoré, aucune semaine fantôme ni barre incohérente. Test : `regrouperActiviteParSemaine` (Task 2).
3. **Compte avec une clé active expirée et une clé active valide** → la valide fait foi ; « Prolonger » ne touche pas l'ancienne. Test : `cleDAccesCourante` (Task 4).
4. **Catégorie source masquée fusionnée vers une cible visible** → autorisé : masquer n'empêche pas de ranger. Test : `decisionFusion` (Task 3).
5. **Fusion d'une catégorie masquée vers elle-même** → « même catégorie » l'emporte sur « cible masquée » (message le plus précis). Test : `decisionFusion` (Task 3).

## Carte des fichiers

```
src/lib/admin-session.ts                    exigerAdmin() serveur (créé, Task 5)
src/lib/admin-stats.ts                      regroupement hebdomadaire (créé, Task 2)
src/lib/admin-categories.ts                 décisions renommage/fusion (créé, Task 3)
src/lib/admin-acces.ts                      clé courante + prolongation (créé, Task 4)
src/lib/erreur-api.ts                       messageErreur(res, defaut) (créé, Task 6)
src/lib/guards.ts                           garde /api/admin (modifié, Task 1)

src/app/admin/layout.tsx                    shell admin (créé, Task 5)
src/app/admin/page.tsx                      vue d'ensemble (créé, Task 6)
src/app/admin/cles/page.tsx                 clés, intégré au shell (modifié, Task 5)
src/app/admin/categories/page.tsx           catégories (créé, Task 7)
src/app/admin/utilisateurs/page.tsx         utilisateurs (créé, Task 8)

src/components/admin/onglets-admin.tsx      onglets actifs (créé, Task 5)
src/components/admin/categories-client.tsx  (créé, Task 7)
src/components/admin/utilisateurs-client.tsx(créé, Task 8)
src/components/admin/cles-client.tsx        liste en cartes (modifié, Task 10)

src/app/api/admin/categories/[id]/route.ts            PATCH renommer/masquer (Task 7)
src/app/api/admin/categories/[id]/fusionner/route.ts  POST fusionner (Task 7)
src/app/api/admin/users/[id]/route.ts                 PATCH rôle (Task 8)
src/app/api/admin/users/[id]/acces/route.ts           POST prolonger + DELETE révoquer (Task 8)

src/app/(app)/layout.tsx                    rôle lu + estAdmin (modifié, Task 9)
src/components/nav-bar.tsx                  lien admin (modifié, Task 9)

tests/guards.test.ts                        cas /api/admin (modifié, Task 1)
tests/admin-stats.test.ts                   (créé, Task 2)
tests/admin-categories.test.ts              (créé, Task 3)
tests/admin-acces.test.ts                   (créé, Task 4)
```

Ordre : garde → logique pure → shell → vue d'ensemble → catégories → utilisateurs → clés → navigation → vérification finale.

---

### Task 1: Garde `/api/admin/*` (TDD)

**Files:**
- Modify: `src/lib/guards.ts`
- Test: `tests/guards.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `routeGuard` traite désormais `/api/admin` comme `/admin` (même décision).

- [ ] **Step 1: Ajouter les tests qui échouent**

Dans `tests/guards.test.ts`, après le cas « non-admin sur /admin », ajouter :

```ts
it("non-admin sur /api/admin → /", () => {
  expect(
    routeGuard("/api/admin/keys", { hasSession: true, isAdmin: false, licenseOk: true })
  ).toEqual({ allow: false, redirectTo: "/" });
});

it("admin sur /api/admin → autorisé", () => {
  expect(
    routeGuard("/api/admin/keys", { hasSession: true, isAdmin: true, licenseOk: true }).allow
  ).toBe(true);
});

it("non-admin sans clé sur /api/admin → / (le rôle prime)", () => {
  expect(
    routeGuard("/api/admin/keys", { hasSession: true, isAdmin: false, licenseOk: false })
  ).toEqual({ allow: false, redirectTo: "/" });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/guards.test.ts`
Expected: FAIL — `/api/admin/keys` renvoie `{ allow: true }` pour un membre licencié.

- [ ] **Step 3: Implémenter**

Dans `src/lib/guards.ts`, remplacer le test de préfixe :

```ts
function espaceAdmin(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  );
}

export function routeGuard(pathname: string, ctx: GuardContext): GuardDecision {
  if (pathname === "/connexion") return { allow: true };
  if (!ctx.hasSession) return { allow: false, redirectTo: "/connexion" };
  if (espaceAdmin(pathname)) {
    return ctx.isAdmin ? { allow: true } : { allow: false, redirectTo: "/" };
  }
  if (!ctx.licenseOk) return { allow: false, redirectTo: "/connexion?erreur=cle" };
  return { allow: true };
}
```

Le middleware (`src/middleware.ts`) n'a pas besoin de changer : il transforme déjà un refus sur `/api/...` en `401`/`403` JSON. Le contrôle par route reste en place (défense en profondeur).

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run tests/guards.test.ts`
Expected: PASS (8 cas).

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/guards.ts tests/guards.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "fix: require admin role for admin API routes"
```

---

### Task 2: Regroupement hebdomadaire des stats (TDD)

**Files:**
- Create: `src/lib/admin-stats.ts`
- Test: `tests/admin-stats.test.ts`

**Interfaces:**
- Consumes: `weekStart`, `formatDateIso` de `@/lib/plan`.
- Produces (Task 6) :
  ```ts
  export type ActiviteSemaine = {
    debut: string; // "YYYY-MM-DD", lundi UTC
    inscriptions: number;
    recettes: number;
    cles: number;
  };
  export type EvenementsActivite = {
    inscriptions: readonly Date[];
    recettes: readonly Date[];
    cles: readonly Date[];
  };
  export function regrouperActiviteParSemaine(
    evenements: EvenementsActivite,
    nbSemaines: number,
    maintenant: Date
  ): ActiviteSemaine[]; // ordre croissant, semaine courante incluse
  ```

- [ ] **Step 1: Écrire le test qui échoue**

`tests/admin-stats.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { regrouperActiviteParSemaine } from "@/lib/admin-stats";

// Lundi 16 novembre 2026, 12:00 UTC. Semaine courante : 2026-11-16.
const MAINTENANT = new Date("2026-11-16T12:00:00Z");
const VIDE = { inscriptions: [], recettes: [], cles: [] };

describe("regrouperActiviteParSemaine", () => {
  it("renvoie exactement nbSemaines semaines, croissantes, semaine courante incluse", () => {
    const semaines = regrouperActiviteParSemaine(VIDE, 6, MAINTENANT);
    expect(semaines.map((s) => s.debut)).toEqual([
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
      "2026-11-02",
      "2026-11-09",
      "2026-11-16",
    ]);
  });

  it("laisse les semaines vides à zéro", () => {
    const semaines = regrouperActiviteParSemaine(VIDE, 3, MAINTENANT);
    expect(semaines).toEqual([
      { debut: "2026-11-02", inscriptions: 0, recettes: 0, cles: 0 },
      { debut: "2026-11-09", inscriptions: 0, recettes: 0, cles: 0 },
      { debut: "2026-11-16", inscriptions: 0, recettes: 0, cles: 0 },
    ]);
  });

  it("range un lundi 00:00 UTC dans sa semaine et un dimanche 23:59 dans la précédente", () => {
    const semaines = regrouperActiviteParSemaine(
      {
        inscriptions: [new Date("2026-11-16T00:00:00Z")],
        recettes: [new Date("2026-11-15T23:59:59Z")],
        cles: [],
      },
      6,
      MAINTENANT
    );
    expect(semaines[5]).toMatchObject({ debut: "2026-11-16", inscriptions: 1, recettes: 0 });
    expect(semaines[4]).toMatchObject({ debut: "2026-11-09", inscriptions: 0, recettes: 1 });
  });

  it("ignore les dates antérieures à la fenêtre", () => {
    const semaines = regrouperActiviteParSemaine(
      {
        inscriptions: [new Date("2026-10-11T23:59:59Z")],
        recettes: [new Date("2026-10-12T00:00:00Z")],
        cles: [],
      },
      6,
      MAINTENANT
    );
    expect(semaines[0]).toMatchObject({ debut: "2026-10-12", inscriptions: 0, recettes: 1 });
    expect(semaines.reduce((n, s) => n + s.inscriptions, 0)).toBe(0);
  });

  it("ignore un événement daté après la semaine courante", () => {
    const semaines = regrouperActiviteParSemaine(
      { inscriptions: [new Date("2026-11-23T00:00:00Z")], recettes: [], cles: [] },
      6,
      MAINTENANT
    );
    expect(semaines.reduce((n, s) => n + s.inscriptions, 0)).toBe(0);
  });

  it("compte chaque type d'événement dans sa propre série", () => {
    const semaines = regrouperActiviteParSemaine(
      {
        inscriptions: [new Date("2026-11-02T08:00:00Z"), new Date("2026-11-03T08:00:00Z")],
        recettes: [new Date("2026-11-02T09:00:00Z")],
        cles: [new Date("2026-11-16T09:00:00Z"), new Date("2026-11-16T10:00:00Z")],
      },
      6,
      MAINTENANT
    );
    expect(semaines[3]).toEqual({
      debut: "2026-11-02",
      inscriptions: 2,
      recettes: 1,
      cles: 0,
    });
    expect(semaines[5]).toEqual({
      debut: "2026-11-16",
      inscriptions: 0,
      recettes: 0,
      cles: 2,
    });
  });

  it("renvoie un tableau vide si nbSemaines <= 0", () => {
    expect(regrouperActiviteParSemaine(VIDE, 0, MAINTENANT)).toEqual([]);
    expect(regrouperActiviteParSemaine(VIDE, -2, MAINTENANT)).toEqual([]);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/admin-stats.test.ts`
Expected: FAIL — module `@/lib/admin-stats` introuvable.

- [ ] **Step 3: Implémenter**

`src/lib/admin-stats.ts` :

```ts
import { formatDateIso, weekStart } from "@/lib/plan";

export type ActiviteSemaine = {
  debut: string;
  inscriptions: number;
  recettes: number;
  cles: number;
};

export type EvenementsActivite = {
  inscriptions: readonly Date[];
  recettes: readonly Date[];
  cles: readonly Date[];
};

export function regrouperActiviteParSemaine(
  evenements: EvenementsActivite,
  nbSemaines: number,
  maintenant: Date
): ActiviteSemaine[] {
  if (nbSemaines <= 0) return [];

  const courante = weekStart(maintenant);
  const semaines: ActiviteSemaine[] = [];
  const index = new Map<string, number>();

  for (let i = nbSemaines - 1; i >= 0; i--) {
    const debut = new Date(courante);
    debut.setUTCDate(debut.getUTCDate() - i * 7);
    const cle = formatDateIso(debut);
    index.set(cle, semaines.length);
    semaines.push({ debut: cle, inscriptions: 0, recettes: 0, cles: 0 });
  }

  function compter(dates: readonly Date[], champ: "inscriptions" | "recettes" | "cles") {
    for (const date of dates) {
      const i = index.get(formatDateIso(weekStart(date)));
      if (i !== undefined) semaines[i][champ] += 1;
    }
  }

  compter(evenements.inscriptions, "inscriptions");
  compter(evenements.recettes, "recettes");
  compter(evenements.cles, "cles");
  return semaines;
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run tests/admin-stats.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/admin-stats.ts tests/admin-stats.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add weekly admin activity grouping"
```

---

### Task 3: Décisions de renommage et de fusion (TDD)

**Files:**
- Create: `src/lib/admin-categories.ts`
- Test: `tests/admin-categories.test.ts`

**Interfaces:**
- Consumes: `normaliserCategorie`, `CATEGORIE_AUTRE` de `@/lib/categories`.
- Produces (Task 7) :
  ```ts
  export type CategoriePourDecision = {
    id: string;
    nom: string;
    cle: string;
    masquee: boolean;
  };

  export type DecisionRenommage =
    | { ok: true; cle: string }
    | { ok: false; raison: "vide" | "trop-long" }
    | { ok: false; raison: "collision"; categorie: { id: string; nom: string } };

  export function decisionRenommage(
    nom: string,
    id: string,
    categories: readonly CategoriePourDecision[]
  ): DecisionRenommage;

  export type DecisionFusion =
    | { ok: true }
    | { ok: false; raison: "meme-categorie" | "source-autre" | "inconnue" | "cible-masquee" };

  export function decisionFusion(
    sourceId: string,
    cibleId: string,
    categories: readonly CategoriePourDecision[]
  ): DecisionFusion;
  ```
  Ordre des refus de fusion : même id → inconnue → source `cat-autre` → cible masquée.

- [ ] **Step 1: Écrire le test qui échoue**

`tests/admin-categories.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { decisionRenommage, decisionFusion } from "@/lib/admin-categories";

const CATEGORIES = [
  { id: "cat-vege", nom: "Végé", cle: "vege", masquee: false },
  { id: "cat-viande", nom: "Viande", cle: "viande", masquee: false },
  { id: "cat-autre", nom: "Autre", cle: "autre", masquee: false },
  { id: "cat-cachee", nom: "Cachée", cle: "cachee", masquee: true },
];

describe("decisionRenommage", () => {
  it("normalise accents, casse et espaces", () => {
    expect(decisionRenommage("  VÉGÉ  ", "cat-vege", CATEGORIES)).toEqual({
      ok: true,
      cle: "vege",
    });
  });

  it("accepte une variante du propre nom de la catégorie", () => {
    expect(decisionRenommage("VEGE", "cat-vege", CATEGORIES)).toEqual({ ok: true, cle: "vege" });
  });

  it("refuse un nom vide après normalisation", () => {
    expect(decisionRenommage("   ", "cat-vege", CATEGORIES)).toEqual({ ok: false, raison: "vide" });
  });

  it("refuse un nom de plus de 60 caractères", () => {
    expect(decisionRenommage("x".repeat(61), "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "trop-long",
    });
  });

  it("accepte un nom de 60 caractères", () => {
    expect(decisionRenommage("x".repeat(60), "cat-vege", CATEGORIES)).toEqual({
      ok: true,
      cle: "x".repeat(60),
    });
  });

  it("signale une collision avec une autre catégorie", () => {
    expect(decisionRenommage(" Viande ", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "collision",
      categorie: { id: "cat-viande", nom: "Viande" },
    });
  });
});

describe("decisionFusion", () => {
  it("accepte deux catégories distinctes et visibles", () => {
    expect(decisionFusion("cat-vege", "cat-viande", CATEGORIES)).toEqual({ ok: true });
  });

  it("refuse la fusion vers soi-même", () => {
    expect(decisionFusion("cat-vege", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "meme-categorie",
    });
  });

  it("refuse de fusionner la catégorie de repli « Autre » comme source", () => {
    expect(decisionFusion("cat-autre", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "source-autre",
    });
  });

  it("refuse une cible masquée", () => {
    expect(decisionFusion("cat-vege", "cat-cachee", CATEGORIES)).toEqual({
      ok: false,
      raison: "cible-masquee",
    });
  });

  it("autorise une source masquée vers une cible visible", () => {
    expect(decisionFusion("cat-cachee", "cat-viande", CATEGORIES)).toEqual({ ok: true });
  });

  it("donne priorité à « même catégorie » sur « cible masquée »", () => {
    expect(decisionFusion("cat-cachee", "cat-cachee", CATEGORIES)).toEqual({
      ok: false,
      raison: "meme-categorie",
    });
  });

  it("refuse une source ou une cible inconnue", () => {
    expect(decisionFusion("cat-inconnue", "cat-vege", CATEGORIES)).toEqual({
      ok: false,
      raison: "inconnue",
    });
    expect(decisionFusion("cat-vege", "cat-inconnue", CATEGORIES)).toEqual({
      ok: false,
      raison: "inconnue",
    });
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/admin-categories.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

`src/lib/admin-categories.ts` :

```ts
import { CATEGORIE_AUTRE, normaliserCategorie } from "@/lib/categories";

export type CategoriePourDecision = {
  id: string;
  nom: string;
  cle: string;
  masquee: boolean;
};

export type DecisionRenommage =
  | { ok: true; cle: string }
  | { ok: false; raison: "vide" | "trop-long" }
  | { ok: false; raison: "collision"; categorie: { id: string; nom: string } };

export function decisionRenommage(
  nom: string,
  id: string,
  categories: readonly CategoriePourDecision[]
): DecisionRenommage {
  const nomPropre = nom.trim();
  if (!nomPropre) return { ok: false, raison: "vide" };
  if (nomPropre.length > 60) return { ok: false, raison: "trop-long" };

  const cle = normaliserCategorie(nomPropre);
  if (!cle) return { ok: false, raison: "vide" };

  const autre = categories.find((c) => c.cle === cle && c.id !== id);
  if (autre) {
    return { ok: false, raison: "collision", categorie: { id: autre.id, nom: autre.nom } };
  }
  return { ok: true, cle };
}

export type DecisionFusion =
  | { ok: true }
  | { ok: false; raison: "meme-categorie" | "source-autre" | "inconnue" | "cible-masquee" };

export function decisionFusion(
  sourceId: string,
  cibleId: string,
  categories: readonly CategoriePourDecision[]
): DecisionFusion {
  if (sourceId === cibleId) return { ok: false, raison: "meme-categorie" };

  const source = categories.find((c) => c.id === sourceId);
  const cible = categories.find((c) => c.id === cibleId);
  if (!source || !cible) return { ok: false, raison: "inconnue" };
  if (source.id === CATEGORIE_AUTRE) return { ok: false, raison: "source-autre" };
  if (cible.masquee) return { ok: false, raison: "cible-masquee" };
  return { ok: true };
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run tests/admin-categories.test.ts`
Expected: PASS (13 tests).

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/admin-categories.ts tests/admin-categories.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add admin category rename and merge decisions"
```

---

### Task 4: Clé d'accès courante et prolongation (TDD)

**Files:**
- Create: `src/lib/admin-acces.ts`
- Test: `tests/admin-acces.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces (Task 8) :
  ```ts
  export type CleAcces = {
    id: string;
    status: "UNUSED" | "ACTIVE" | "REVOKED";
    expiresAt: Date | null;
    activatedAt: Date | null;
  };

  export function cleDAccesCourante<T extends CleAcces>(cles: readonly T[]): T | null;

  export function prolongerAcces(
    expiresAt: Date | null,
    jours: number | null,
    maintenant: Date
  ): Date | null;
  ```
  Règles : parmi les `ACTIVE`, illimitée prioritaire, puis expiration la plus lointaine, puis activation la plus récente. Prolongation : `jours = null` → illimité ; déjà illimité → reste illimité ; expirée → depuis maintenant ; valide → ajoutée à l'expiration.

- [ ] **Step 1: Écrire le test qui échoue**

`tests/admin-acces.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { cleDAccesCourante, prolongerAcces } from "@/lib/admin-acces";

const T = (iso: string | null) => (iso ? new Date(iso) : null);
const JOUR = 24 * 60 * 60 * 1000;

function cle(
  id: string,
  status: "UNUSED" | "ACTIVE" | "REVOKED",
  expiresAt: Date | null,
  activatedAt: Date | null = null
) {
  return { id, status, expiresAt, activatedAt };
}

describe("cleDAccesCourante", () => {
  it("renvoie null sans clé active", () => {
    expect(cleDAccesCourante([])).toBeNull();
    expect(
      cleDAccesCourante([
        cle("a", "UNUSED", null),
        cle("b", "REVOKED", T("2027-01-01T00:00:00Z")),
      ])
    ).toBeNull();
  });

  it("privilégie une clé illimitée", () => {
    const illimitee = cle("a", "ACTIVE", null, T("2026-01-01T00:00:00Z"));
    const datee = cle("b", "ACTIVE", T("2030-01-01T00:00:00Z"), T("2026-06-01T00:00:00Z"));
    expect(cleDAccesCourante([datee, illimitee])?.id).toBe("a");
  });

  it("prend l'expiration la plus lointaine", () => {
    const proche = cle("a", "ACTIVE", T("2026-12-01T00:00:00Z"), T("2026-11-01T00:00:00Z"));
    const loin = cle("b", "ACTIVE", T("2027-03-01T00:00:00Z"), T("2026-10-01T00:00:00Z"));
    expect(cleDAccesCourante([proche, loin])?.id).toBe("b");
  });

  it("préfère une clé valide à une clé active expirée", () => {
    const expiree = cle("a", "ACTIVE", T("2026-01-01T00:00:00Z"), T("2025-12-01T00:00:00Z"));
    const valide = cle("b", "ACTIVE", T("2027-06-01T00:00:00Z"), T("2026-10-01T00:00:00Z"));
    expect(cleDAccesCourante([expiree, valide])?.id).toBe("b");
  });

  it("départage une égalité d'expiration par l'activation la plus récente", () => {
    const ancienne = cle("a", "ACTIVE", T("2027-01-01T00:00:00Z"), T("2026-01-01T00:00:00Z"));
    const recente = cle("b", "ACTIVE", T("2027-01-01T00:00:00Z"), T("2026-06-01T00:00:00Z"));
    expect(cleDAccesCourante([ancienne, recente])?.id).toBe("b");
  });

  it("départage deux clés illimitées par l'activation la plus récente", () => {
    const ancienne = cle("a", "ACTIVE", null, T("2026-01-01T00:00:00Z"));
    const recente = cle("b", "ACTIVE", null, T("2026-06-01T00:00:00Z"));
    expect(cleDAccesCourante([ancienne, recente])?.id).toBe("b");
  });
});

describe("prolongerAcces", () => {
  const MAINTENANT = new Date("2026-11-22T12:00:00Z");

  it("jours null rend l'accès illimité", () => {
    expect(prolongerAcces(T("2026-12-01T00:00:00Z"), null, MAINTENANT)).toBeNull();
  });

  it("un accès déjà illimité le reste", () => {
    expect(prolongerAcces(null, 30, MAINTENANT)).toBeNull();
  });

  it("prolonge depuis maintenant une clé expirée", () => {
    expect(prolongerAcces(T("2026-11-01T00:00:00Z"), 7, MAINTENANT)?.toISOString()).toBe(
      "2026-11-29T12:00:00.000Z"
    );
  });

  it("ajoute les jours à une clé encore valide", () => {
    expect(prolongerAcces(T("2026-12-10T00:00:00Z"), 30, MAINTENANT)?.toISOString()).toBe(
      "2027-01-09T00:00:00.000Z"
    );
  });

  it("gère 90 jours", () => {
    const resultat = prolongerAcces(T("2026-12-10T00:00:00Z"), 90, MAINTENANT);
    expect(resultat?.getTime()).toBe(T("2026-12-10T00:00:00Z")!.getTime() + 90 * JOUR);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/admin-acces.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implémenter**

`src/lib/admin-acces.ts` :

```ts
export type CleAcces = {
  id: string;
  status: "UNUSED" | "ACTIVE" | "REVOKED";
  expiresAt: Date | null;
  activatedAt: Date | null;
};

export function cleDAccesCourante<T extends CleAcces>(cles: readonly T[]): T | null {
  const actives = cles.filter((c) => c.status === "ACTIVE");
  if (actives.length === 0) return null;

  return actives.reduce((meilleure, candidate) => {
    // 1. Illimitée prioritaire.
    if (meilleure.expiresAt === null && candidate.expiresAt !== null) return meilleure;
    if (candidate.expiresAt === null && meilleure.expiresAt !== null) return candidate;

    // 2. Expiration la plus lointaine.
    if (candidate.expiresAt && meilleure.expiresAt) {
      const ecart = candidate.expiresAt.getTime() - meilleure.expiresAt.getTime();
      if (ecart > 0) return candidate;
      if (ecart < 0) return meilleure;
    }

    // 3. Activation la plus récente (null = plus ancienne).
    const activation = (c: T) => c.activatedAt?.getTime() ?? 0;
    return activation(candidate) > activation(meilleure) ? candidate : meilleure;
  });
}

export function prolongerAcces(
  expiresAt: Date | null,
  jours: number | null,
  maintenant: Date
): Date | null {
  if (jours === null) return null;
  if (expiresAt === null) return null;

  const base = expiresAt.getTime() > maintenant.getTime() ? expiresAt : maintenant;
  return new Date(base.getTime() + jours * 24 * 60 * 60 * 1000);
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run tests/admin-acces.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/admin-acces.ts tests/admin-acces.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add current license key and access extension logic"
```

---

### Task 5: Shell admin, helper d'accès et onglets

**Files:**
- Create: `src/lib/admin-session.ts`
- Create: `src/app/admin/layout.tsx`
- Create: `src/components/admin/onglets-admin.tsx`
- Modify: `src/app/admin/cles/page.tsx` (retirer le wrapper plein écran, utiliser le helper)

**Interfaces:**
- Consumes: `auth`, `db`, `MiamzStatuette`.
- Produces (Tasks 6–10) :
  - `exigerAdmin(): Promise<string>` — id de l'admin courant, redirige `/connexion` sans session et `/` sans rôle ADMIN.
  - Shell disponible pour toutes les pages `/admin/*`.
  - `OngletsAdmin` sans props.

- [ ] **Step 1: Créer le helper serveur**

`src/lib/admin-session.ts` :

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

/**
 * Contrôle ADMIN des pages serveur. Retourne l'id de l'admin courant.
 * Le middleware protège déjà les pages, mais chaque page refait le contrôle
 * (défense en profondeur et rendu direct possible).
 */
export async function exigerAdmin(): Promise<string> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect("/connexion");

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") redirect("/");
  return userId;
}
```

- [ ] **Step 2: Créer les onglets**

`src/components/admin/onglets-admin.tsx` :

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ONGLETS = [
  { href: "/admin", label: "Vue d'ensemble" },
  { href: "/admin/cles", label: "Clés" },
  { href: "/admin/categories", label: "Catégories" },
  { href: "/admin/utilisateurs", label: "Utilisateurs" },
];

export default function OngletsAdmin() {
  const pathname = usePathname();

  return (
    <nav aria-label="Sections admin" className="mx-auto w-full max-w-4xl px-2">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {ONGLETS.map((onglet) => {
          const actif =
            onglet.href === "/admin" ? pathname === "/admin" : pathname.startsWith(onglet.href);
          return (
            <Link
              key={onglet.href}
              href={onglet.href}
              aria-current={actif ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center rounded-t-xl px-4 text-sm font-medium transition ${
                actif
                  ? "bg-[#4A6741] text-white"
                  : "text-texte-doux hover:bg-[#A8E6CF]/30"
              }`}
            >
              {onglet.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Créer le shell**

`src/app/admin/layout.tsx` :

```tsx
import Link from "next/link";
import { exigerAdmin } from "@/lib/admin-session";
import MiamzStatuette from "@/components/miamz-statuette";
import OngletsAdmin from "@/components/admin/onglets-admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigerAdmin();

  return (
    <div className="min-h-screen pb-10">
      <header className="border-b border-bordure bg-fond-voile">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/admin"
            className="flex min-h-11 items-center gap-2 text-lg font-semibold text-[#4A6741]"
          >
            <MiamzStatuette size={30} /> Miamz Admin
          </Link>
          <Link
            href="/plan"
            className="flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-texte-doux transition hover:bg-[#A8E6CF]/30"
          >
            Retour à l&apos;app
          </Link>
        </div>
        <OngletsAdmin />
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Intégrer la page Clés au shell**

`src/app/admin/cles/page.tsx` : supprimer les imports `auth` et `redirect` et le bloc `session`/`user` (garder `db` et `licenseStatus` pour la lecture des clés). Remplacer le début par `await exigerAdmin();`. Remplacer le rendu :

```tsx
return (
  <div>
    <h1 className="mb-2 text-2xl font-semibold text-miamz-vert">Clés d&apos;activation</h1>
    <p className="mb-6 text-sm text-texte-doux">
      Génère des clés, regarde leur statut, révoque à la demande.
    </p>
    <ClesAdmin
      initialKeys={keys.map((k) => ({
        ...k,
        statut: licenseStatus({ status: k.status, expiresAt: k.expiresAt }, now),
      }))}
    />
  </div>
);
```

Aucune autre logique ne change à cette étape.

- [ ] **Step 5: Vérifier**

Run: `npm run build` → vert. Routes `/admin`, `/admin/cles`, `/admin/categories`, `/admin/utilisateurs` pas encore toutes présentes ; seules `/admin/cles` est compilée pour l'instant.
Contrôle visuel après déploiement : `/admin/cles` affiche l'en-tête « Miamz Admin », les onglets défilent à 360 px, aucun débordement de page.

- [ ] **Step 6: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/admin-session.ts src/app/admin/layout.tsx src/components/admin/onglets-admin.tsx src/app/admin/cles/page.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add admin shell and navigation tabs"
```

---

### Task 6: Vue d'ensemble, chiffres et activité

**Files:**
- Create: `src/lib/erreur-api.ts`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `regrouperActiviteParSemaine` (Task 2), `weekStart` (`@/lib/plan`), `exigerAdmin` (Task 5).
- Produces (Tasks 7–8) : `messageErreur(res: Response, defaut: string): Promise<string>`.

- [ ] **Step 1: Créer le helper d'erreur HTTP**

`src/lib/erreur-api.ts` :

```ts
/** Message d'erreur JSON d'une route API, ou le libellé de repli. */
export async function messageErreur(res: Response, defaut: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return typeof data.error === "string" ? data.error : defaut;
}
```

- [ ] **Step 2: Créer la page Vue d'ensemble**

`src/app/admin/page.tsx` : composant serveur, `await exigerAdmin()`, puis les requêtes et le rendu ci-dessous.

Requêtes (une seule `Promise.all`) :

```tsx
const maintenant = new Date();
const debutSemaine = weekStart(maintenant);
const finSemaine = new Date(debutSemaine);
finSemaine.setUTCDate(finSemaine.getUTCDate() + 7);
const debutMois = new Date(Date.UTC(maintenant.getUTCFullYear(), maintenant.getUTCMonth(), 1));
const debutFenetre = new Date(debutSemaine);
debutFenetre.setUTCDate(debutFenetre.getUTCDate() - 35);

const [
  totalUtilisateurs,
  nouveauxMois,
  accesActifs,
  clesDisponibles,
  totalRecettes,
  repasSemaine,
  courses,
  dernieres,
  parCategorie,
  inscriptions,
  recettesCreees,
  clesCreees,
] = await Promise.all([
  db.user.count(),
  db.user.count({ where: { createdAt: { gte: debutMois } } }),
  db.user.count({
    where: {
      licenseKeys: {
        some: {
          status: "ACTIVE",
          OR: [{ expiresAt: null }, { expiresAt: { gt: maintenant } }],
        },
      },
    },
  }),
  db.licenseKey.count({ where: { status: "UNUSED" } }),
  db.recipe.count(),
  db.mealPlanEntry.count({ where: { date: { gte: debutSemaine, lt: finSemaine } } }),
  db.groceryListItem.count({ where: { checked: false, masquee: false } }),
  db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, name: true, email: true, createdAt: true },
  }),
  db.categorie.findMany({
    select: { id: true, nom: true, _count: { select: { recettes: true } } },
  }),
  db.user.findMany({ where: { createdAt: { gte: debutFenetre } }, select: { createdAt: true } }),
  db.recipe.findMany({ where: { createdAt: { gte: debutFenetre } }, select: { createdAt: true } }),
  db.licenseKey.findMany({ where: { createdAt: { gte: debutFenetre } }, select: { createdAt: true } }),
]);
```

Calculs :

```tsx
const activite = regrouperActiviteParSemaine(
  {
    inscriptions: inscriptions.map((u) => u.createdAt),
    recettes: recettesCreees.map((r) => r.createdAt),
    cles: clesCreees.map((k) => k.createdAt),
  },
  6,
  maintenant
);
const totalActivite = activite.reduce(
  (n, s) => n + s.inscriptions + s.recettes + s.cles,
  0
);
const categoriesUtilisees = parCategorie
  .map((c) => ({ id: c.id, nom: c.nom, nombre: c._count.recettes }))
  .filter((c) => c.nombre > 0)
  .sort((a, b) => b.nombre - a.nombre);
const topCategories = categoriesUtilisees.slice(0, 5);
const resteCategories = categoriesUtilisees.slice(5).reduce((n, c) => n + c.nombre, 0);
const maxActivite = Math.max(
  1,
  ...activite.flatMap((s) => [s.inscriptions, s.recettes, s.cles])
);
const hauteur = (valeur: number) => `${Math.round((valeur / maxActivite) * 100)}%`;
const labelSemaine = (debut: string) => `${debut.slice(8, 10)}/${debut.slice(5, 7)}`;
```

Rendu — structure complète :

```tsx
<div className="flex flex-col gap-6">
  <div>
    <h1 className="mb-1 text-2xl font-semibold text-miamz-vert">Vue d&apos;ensemble</h1>
    <p className="text-sm text-texte-doux">L&apos;usage de Miamz en un coup d&apos;œil.</p>
  </div>

  <section aria-label="Chiffres clés" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    <CarteStat
      libelle="Utilisateurs"
      valeur={totalUtilisateurs}
      detail={nouveauxMois > 0 ? `+${nouveauxMois} ce mois` : "Aucun nouveau ce mois"}
    />
    <CarteStat libelle="Accès actifs" valeur={accesActifs} detail="Clés valides" />
    <CarteStat libelle="Clés disponibles" valeur={clesDisponibles} detail="Prêtes à distribuer" />
    <CarteStat libelle="Recettes" valeur={totalRecettes} detail="Toutes catégories" />
    <CarteStat libelle="Repas cette semaine" valeur={repasSemaine} detail="Tous comptes" />
    <CarteStat libelle="Courses à cocher" valeur={courses} detail="Non masquées" />
  </section>

  <section className="carte p-4 sm:p-6">
    <h2 className="mb-1 font-medium text-foreground">Activité des 6 dernières semaines</h2>
    <p className="mb-4 text-xs text-texte-tres-doux">Semaines du lundi au dimanche (UTC).</p>
    {totalActivite === 0 ? (
      <p className="text-sm text-texte-tres-doux">Aucune activité sur la période.</p>
    ) : (
      <>
        <div className="mb-4 flex flex-wrap gap-3 text-xs text-texte-doux">
          <Legende couleur="#A8E6CF" label="Inscriptions" />
          <Legende couleur="#C9B6E4" label="Recettes" />
          <Legende couleur="#E07A5F" label="Clés" />
        </div>
        <div className="flex items-end gap-2 sm:gap-3" aria-hidden="true">
          {activite.map((s) => (
            <div key={s.debut} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end justify-center gap-1">
                <div
                  className="w-2 rounded-t bg-[#A8E6CF]"
                  style={{ height: hauteur(s.inscriptions) }}
                />
                <div
                  className="w-2 rounded-t bg-[#C9B6E4]"
                  style={{ height: hauteur(s.recettes) }}
                />
                <div className="w-2 rounded-t bg-[#E07A5F]" style={{ height: hauteur(s.cles) }} />
              </div>
              <span className="text-[10px] text-texte-tres-doux">{labelSemaine(s.debut)}</span>
            </div>
          ))}
        </div>
        <ul className="sr-only">
          {activite.map((s) => (
            <li key={s.debut}>
              Semaine du {labelSemaine(s.debut)} : {s.inscriptions} inscription(s),{" "}
              {s.recettes} recette(s), {s.cles} clé(s).
            </li>
          ))}
        </ul>
      </>
    )}
  </section>

  <section className="carte p-4 sm:p-6">
    <h2 className="mb-4 font-medium text-foreground">Catégories les plus utilisées</h2>
    {topCategories.length === 0 ? (
      <p className="text-sm text-texte-tres-doux">Aucune recette classée pour le moment.</p>
    ) : (
      <ul className="flex flex-col gap-3">
        {topCategories.map((c) => (
          <li key={c.id}>
            <div className="mb-1 flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">{c.nom}</span>
              <span className="shrink-0 text-texte-doux">{c.nombre}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-[#A8E6CF]"
                style={{
                  width: `${Math.round((c.nombre / topCategories[0].nombre) * 100)}%`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    )}
    {resteCategories > 0 && (
      <p className="mt-3 text-xs text-texte-tres-doux">
        Et {resteCategories} recette(s) dans les autres catégories.
      </p>
    )}
  </section>

  <section className="carte p-4 sm:p-6">
    <h2 className="mb-2 font-medium text-foreground">Dernières inscriptions</h2>
    {dernieres.length === 0 ? (
      <p className="text-sm text-texte-tres-doux">Aucun compte.</p>
    ) : (
      <ul className="divide-y divide-bordure">
        {dernieres.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{u.name ?? u.email}</span>
              {u.name && (
                <span className="block truncate text-xs text-texte-doux">{u.email}</span>
              )}
            </span>
            <span className="shrink-0 text-xs text-texte-tres-doux">
              {u.createdAt.toLocaleDateString("fr-FR")}
            </span>
          </li>
        ))}
      </ul>
    )}
  </section>
</div>
```

Composants locaux (sous la page) :

```tsx
function CarteStat({ libelle, valeur, detail }: { libelle: string; valeur: number; detail: string }) {
  return (
    <div className="carte p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-texte-tres-doux">{libelle}</p>
      <p className="mt-1 text-2xl font-semibold text-[#4A6741]">{valeur}</p>
      <p className="mt-1 text-xs text-texte-doux">{detail}</p>
    </div>
  );
}

function Legende({ couleur, label }: { couleur: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: couleur }} />
      {label}
    </span>
  );
}
```

- [ ] **Step 3: Vérifier**

Run: `npm run build` → vert, route `/admin` compilée.
Contrôle visuel à 360 px : 2 colonnes de cartes, barres lisibles, aucun débordement.

- [ ] **Step 4: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/erreur-api.ts src/app/admin/page.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add admin overview with live statistics"
```

---

### Task 7: Catégories — API, page et client

**Files:**
- Create: `src/app/api/admin/categories/[id]/route.ts`
- Create: `src/app/api/admin/categories/[id]/fusionner/route.ts`
- Create: `src/app/admin/categories/page.tsx`
- Create: `src/components/admin/categories-client.tsx`

**Interfaces:**
- Consumes: `decisionRenommage`, `decisionFusion` (Task 3), `CATEGORIE_AUTRE`, `exigerAdmin`, `messageErreur`, `FeuilleModale`.
- Produces :
  - `PATCH /api/admin/categories/[id]` body `{ nom }` ou `{ masquee }`.
  - `POST /api/admin/categories/[id]/fusionner` body `{ cibleId }`.
  - `export type CategorieAdminVue = { id; nom; cle; masquee; recettes }`.

- [ ] **Step 1: Route renommer / masquer**

`src/app/api/admin/categories/[id]/route.ts` :

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CATEGORIE_AUTRE } from "@/lib/categories";
import { decisionRenommage } from "@/lib/admin-categories";
import { NextResponse } from "next/server";

const SELECTION = { id: true, nom: true, cle: true, masquee: true } as const;

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existante = await db.categorie.findUnique({ where: { id }, select: { id: true } });
  if (!existante) return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  if ("nom" in body) {
    if (typeof body.nom !== "string") {
      return NextResponse.json({ error: "Nom invalide" }, { status: 400 });
    }
    const nom = body.nom.trim();
    const categories = await db.categorie.findMany({ select: SELECTION });
    const decision = decisionRenommage(nom, id, categories);
    if (!decision.ok) {
      if (decision.raison === "vide" || decision.raison === "trop-long") {
        return NextResponse.json(
          { error: "Le nom doit contenir 1 à 60 caractères" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Cette catégorie existe déjà", collision: decision.categorie },
        { status: 409 }
      );
    }

    const categorie = await db.categorie.update({
      where: { id },
      data: { nom, cle: decision.cle },
      select: SELECTION,
    });
    return NextResponse.json({ categorie });
  }

  if ("masquee" in body) {
    if (typeof body.masquee !== "boolean") {
      return NextResponse.json({ error: "Valeur invalide" }, { status: 400 });
    }
    if (id === CATEGORIE_AUTRE && body.masquee) {
      return NextResponse.json(
        { error: "La catégorie « Autre » ne peut pas être masquée" },
        { status: 400 }
      );
    }

    const categorie = await db.categorie.update({
      where: { id },
      data: { masquee: body.masquee },
      select: SELECTION,
    });
    return NextResponse.json({ categorie });
  }

  return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
}
```

- [ ] **Step 2: Route fusion**

`src/app/api/admin/categories/[id]/fusionner/route.ts` :

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decisionFusion } from "@/lib/admin-categories";
import { NextResponse } from "next/server";

const MESSAGES: Record<string, string> = {
  "meme-categorie": "Choisis une catégorie cible différente",
  "source-autre": "La catégorie « Autre » ne peut pas être fusionnée",
  "cible-masquee": "La catégorie cible est masquée",
  inconnue: "Catégorie introuvable",
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const cibleId = typeof body?.cibleId === "string" ? body.cibleId.trim() : "";
  if (!cibleId) {
    return NextResponse.json({ error: "Catégorie cible requise" }, { status: 400 });
  }

  const categories = await db.categorie.findMany({
    select: { id: true, nom: true, cle: true, masquee: true },
  });
  if (!categories.some((c) => c.id === id)) {
    return NextResponse.json({ error: "Catégorie introuvable" }, { status: 404 });
  }
  if (!categories.some((c) => c.id === cibleId)) {
    return NextResponse.json({ error: "Catégorie cible introuvable" }, { status: 404 });
  }

  const decision = decisionFusion(id, cibleId, categories);
  if (!decision.ok) {
    return NextResponse.json({ error: MESSAGES[decision.raison] }, { status: 400 });
  }

  const [deplacement] = await db.$transaction([
    db.recipe.updateMany({ where: { categorieId: id }, data: { categorieId: cibleId } }),
    db.categorie.delete({ where: { id } }),
  ]);

  return NextResponse.json({ deplacees: deplacement.count });
}
```

- [ ] **Step 3: Page serveur**

`src/app/admin/categories/page.tsx` :

```tsx
import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import CategoriesClient from "@/components/admin/categories-client";

export default async function AdminCategoriesPage() {
  await exigerAdmin();

  const categories = await db.categorie.findMany({
    select: {
      id: true,
      nom: true,
      cle: true,
      masquee: true,
      _count: { select: { recettes: true } },
    },
  });
  const vues = categories
    .map((c) => ({
      id: c.id,
      nom: c.nom,
      cle: c.cle,
      masquee: c.masquee,
      recettes: c._count.recettes,
    }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-miamz-vert">Catégories</h1>
      <p className="mb-6 text-sm text-texte-doux">
        Renomme, masque ou fusionne. Fusionner déplace les recettes puis supprime la catégorie
        source.
      </p>
      <CategoriesClient categories={vues} />
    </div>
  );
}
```

- [ ] **Step 4: Client catégories**

`src/components/admin/categories-client.tsx` : `"use client"`.

Type et état :

```tsx
export type CategorieAdminVue = {
  id: string;
  nom: string;
  cle: string;
  masquee: boolean;
  recettes: number;
};

type Dialogue =
  | { type: "renommer"; categorie: CategorieAdminVue }
  | { type: "fusionner"; categorie: CategorieAdminVue; cibleId: string }
  | null;
```

États : `dialogue`, `nom`, `enCours`, `erreur`, `collision`, `message`, `bascule` (id en cours), `erreurBascule`.

Comportements :

- `ouvrirRenommage(c)` → préremplit `nom`, vide erreurs, ouvre la modale.
- `ouvrirFusion(c, cibleId = "")` → vide erreurs, ouvre la modale fusion.
- `fermer()` → ne fait rien si `enCours`, sinon ferme et vide les erreurs.
- `renommer()` → `PATCH /api/admin/categories/{id}` body `{ nom }`. Succès : ferme, message « « NOM » a été enregistrée. », `router.refresh()`. `409` avec `collision` : erreur « Cette catégorie existe déjà » + bouton « Fusionner avec « X » » qui appelle `ouvrirFusion(categorie, collision.id)`. Autre échec : `error` du JSON, repli « Renommage impossible — réessaie. ».
- `fusionner()` → refuse sans `cibleId` (« Choisis une catégorie cible. »), `POST .../fusionner` body `{ cibleId }`. Succès : ferme, message « « SOURCE » a été fusionnée dans « CIBLE » (N recette(s) déplacée(s)). », `router.refresh()`.
- `basculer(c)` → `PATCH` body `{ masquee: !c.masquee }`, bouton de la carte en attente ; succès : message « « NOM » est maintenant masquée/visible. » + refresh ; échec : erreur inline sous la carte.

Rendu :

- Message global en haut : `role="status" aria-live="polite"`, couleur `text-[#4A6741]` ou `text-danger`.
- Liste `<ul className="flex flex-col gap-3">` ; chaque catégorie est une `<li className="carte p-4">` (pas de tableau).
- Ligne 1 : nom (`font-medium`), badge `masquée` si besoin (`rounded-full bg-gray-200 px-2 py-0.5 text-xs text-texte-doux`), compteur `{n} recette(s)`.
- Ligne 2 : trois boutons `bouton-secondaire min-h-11` :
  - **Renommer** ;
  - **Masquer / Afficher** : désactivé si `id === CATEGORIE_AUTRE` avec `title="La catégorie « Autre » est la catégorie de repli : elle ne peut pas être masquée."` et `disabled:opacity-50` ; libellé d'attente « Masquage… » / « Affichage… » ;
  - **Fusionner**.
- Sous la carte `cat-autre` : « Catégorie de repli : elle ne peut être ni masquée ni fusionnée comme source. »
- Erreur de bascule rattachée à sa carte.

Modale renommage (`FeuilleModale`) :

- titre « Renommer la catégorie » ;
- `<label htmlFor="nom-categorie">Nouveau nom</label>` + `<input id="nom-categorie" maxLength={60} className="champ mt-1 w-full" autoFocus />` ;
- compteur `{nom.trim().length}/60` ;
- erreur inline (`role="status"`), bouton de collision le cas échéant ;
- footer : **Annuler** (`bouton-secondaire min-h-11 flex-1`, désactivé pendant l'attente) et **Renommer** (`bouton min-h-11 flex-1`, désactivé si nom blanc ou attente, libellé « Renommage… »).

Modale fusion :

- titre « Fusionner la catégorie » ;
- texte « Les N recette(s) de « X » passeront dans la catégorie choisie, puis « X » sera supprimée. » ;
- `<select id="cible-fusion" className="champ mt-1 w-full">` avec option vide « Choisir… » puis les catégories **non masquées** et différentes de la source, libellé `NOM (n)` ;
- erreur inline ;
- footer : **Annuler** et **Fusionner** (désactivé sans cible ou pendant l'attente, libellé « Fusion… »).

- [ ] **Step 5: Vérifier**

Run: `npm run build` → vert, routes `/admin/categories` et API compilées.
Contrôle manuel après déploiement : renommer « Végé » en « Végétarien » ; renommer une catégorie vers un nom existant → 409 + bouton de fusion direct ; masquer/afficher ; fusionner deux catégories et vérifier que les recettes suivent ; « Autre » ne peut être ni masquée ni fusionnée comme source.

- [ ] **Step 6: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add "src/app/api/admin/categories" "src/app/admin/categories" src/components/admin/categories-client.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add admin category management"
```

---

### Task 8: Utilisateurs — API, page et client

**Files:**
- Create: `src/app/api/admin/users/[id]/route.ts`
- Create: `src/app/api/admin/users/[id]/acces/route.ts`
- Create: `src/app/admin/utilisateurs/page.tsx`
- Create: `src/components/admin/utilisateurs-client.tsx`

**Interfaces:**
- Consumes: `cleDAccesCourante`, `prolongerAcces` (Task 4), `exigerAdmin`, `messageErreur`, `FeuilleModale`, `normaliser`.
- Produces :
  - `PATCH /api/admin/users/[id]` body `{ role }`.
  - `POST /api/admin/users/[id]/acces` body `{ jours: 7 | 30 | 90 | null }`.
  - `DELETE /api/admin/users/[id]/acces`.
  - `export type UtilisateurAdminVue` (voir Step 3).

- [ ] **Step 1: Route de changement de rôle**

`src/app/api/admin/users/[id]/route.ts` :

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const admin = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const role = body?.role;
  if (role !== "USER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }
  if (id === userId) {
    return NextResponse.json(
      { error: "Tu ne peux pas changer ton propre rôle" },
      { status: 400 }
    );
  }

  const cible = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const user = await db.user.update({
    where: { id },
    data: { role },
    select: { id: true, role: true },
  });
  return NextResponse.json({ user });
}
```

- [ ] **Step 2: Route prolonger / révoquer**

`src/app/api/admin/users/[id]/acces/route.ts` :

```ts
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cleDAccesCourante, prolongerAcces } from "@/lib/admin-acces";
import { NextResponse } from "next/server";

const DUREES = new Set([7, 30, 90]);

async function adminCourant(): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  return { userId };
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminCourant();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || !("jours" in body)) {
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
  }
  const jours = body.jours;
  if (jours !== null && !DUREES.has(jours)) {
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
  }

  const cible = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const cles = await db.licenseKey.findMany({
    where: { activatedById: id, status: "ACTIVE" },
    select: { id: true, status: true, expiresAt: true, activatedAt: true },
  });
  const cle = cleDAccesCourante(cles);
  if (!cle) {
    return NextResponse.json({ error: "Aucune clé active à prolonger" }, { status: 409 });
  }
  if (cle.expiresAt === null) {
    return NextResponse.json({ error: "Cet accès est déjà illimité" }, { status: 409 });
  }

  const expiresAt = prolongerAcces(cle.expiresAt, jours, new Date());
  const miseAJour = await db.licenseKey.update({
    where: { id: cle.id },
    data: { expiresAt },
    select: { id: true, expiresAt: true },
  });
  return NextResponse.json({ cle: miseAJour });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await adminCourant();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  if (id === admin.userId) {
    return NextResponse.json(
      { error: "Tu ne peux pas révoquer ton propre accès" },
      { status: 400 }
    );
  }

  const cible = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!cible) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });

  const resultat = await db.licenseKey.updateMany({
    where: { activatedById: id, status: "ACTIVE" },
    data: { status: "REVOKED" },
  });
  if (resultat.count === 0) {
    return NextResponse.json({ error: "Aucune clé active à révoquer" }, { status: 409 });
  }
  return NextResponse.json({ cles: resultat.count });
}
```

- [ ] **Step 3: Page serveur**

`src/app/admin/utilisateurs/page.tsx` :

```tsx
import { db } from "@/lib/db";
import { exigerAdmin } from "@/lib/admin-session";
import { cleDAccesCourante } from "@/lib/admin-acces";
import UtilisateursClient, {
  type UtilisateurAdminVue,
} from "@/components/admin/utilisateurs-client";

export default async function AdminUtilisateursPage() {
  const adminId = await exigerAdmin();
  const maintenant = new Date();

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { recipes: true } },
      licenseKeys: {
        where: { status: "ACTIVE" },
        select: { id: true, status: true, expiresAt: true, activatedAt: true },
      },
    },
  });

  const vues: UtilisateurAdminVue[] = users.map((u) => {
    const cle = cleDAccesCourante(u.licenseKeys);
    const acces: UtilisateurAdminVue["acces"] = !cle
      ? "aucun"
      : cle.expiresAt === null
        ? "illimite"
        : cle.expiresAt > maintenant
          ? "actif"
          : "expire";

    return {
      id: u.id,
      nom: u.name,
      email: u.email,
      role: u.role,
      inscription: u.createdAt.toLocaleDateString("fr-FR"),
      recettes: u._count.recipes,
      acces,
      expireLe: cle?.expiresAt ? cle.expiresAt.toLocaleDateString("fr-FR") : null,
      estSoi: u.id === adminId,
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold text-miamz-vert">Utilisateurs</h1>
      <p className="mb-6 text-sm text-texte-doux">
        {vues.length} compte(s), du plus récent au plus ancien. Change un rôle, prolonge ou coupe
        un accès.
      </p>
      <UtilisateursClient utilisateurs={vues} />
    </div>
  );
}
```

- [ ] **Step 4: Client utilisateurs**

`src/components/admin/utilisateurs-client.tsx` : `"use client"`.

Type exporté :

```tsx
export type UtilisateurAdminVue = {
  id: string;
  nom: string | null;
  email: string;
  role: "ADMIN" | "USER";
  inscription: string; // déjà formatée fr-FR côté serveur
  recettes: number;
  acces: "illimite" | "actif" | "expire" | "aucun";
  expireLe: string | null;
  estSoi: boolean;
};
```

États :

```tsx
type Dialogue =
  | { type: "role"; user: UtilisateurAdminVue; role: "ADMIN" | "USER" }
  | { type: "prolonger"; user: UtilisateurAdminVue; jours: 7 | 30 | 90 | null }
  | { type: "revoquer"; user: UtilisateurAdminVue }
  | null;
```

- `requete` pour la recherche ; filtrage instantané avec `normaliser` de `@/lib/recherche-recettes` :
  `utilisateurs.filter((u) => normaliser(`${u.nom ?? ""} ${u.email}`).includes(normaliser(requete)))`.
- `dialogue`, `enCours`, `erreur`, `message`.

Comportements :

- `changerRole()` → `PATCH /api/admin/users/{id}` body `{ role }` ; succès : ferme, message « Le rôle de X est maintenant Admin/Membre. », `router.refresh()`.
- `prolonger()` → `POST /api/admin/users/{id}/acces` body `{ jours }` ; succès : ferme, message « Accès de X prolongé. », refresh. `409` → afficher le message du serveur (« Aucune clé active à prolonger » / « Cet accès est déjà illimité »).
- `revoquer()` → `DELETE /api/admin/users/{id}/acces` ; succès : ferme, message « N accès révoqué(s) pour X. », refresh.

Rendu :

- Champ de recherche en haut : `<label htmlFor="recherche-utilisateur">Rechercher un utilisateur</label>` (visible, `text-sm font-medium`), input `id="recherche-utilisateur"` `className="champ mt-1 min-h-11 w-full"` placeholder « Nom ou email ».
- Message global `role="status" aria-live="polite"`.
- Liste en cartes (`<ul className="flex flex-col gap-3">`, `<li className="carte p-4">`) — pas de tableau.
- Carte :
  - nom (`u.nom ?? u.email`, `font-medium`, `truncate`) ; si nom, email en second (`text-xs text-texte-doux truncate`) ;
  - badge rôle : **Admin** (`bg-[#C9B6E4] text-[#43325e]`) ou **Membre** (`bg-[#A8E6CF] text-[#2e5340]`), `rounded-full px-2 py-0.5 text-xs` ;
  - accès : « Accès actif jusqu'au {expireLe} » / « Accès expiré depuis le {expireLe} » / « Accès illimité » / « Aucune clé d'accès » ;
  - « Inscrit le {inscription} · {n} recette(s) » ;
  - actions en `flex flex-wrap gap-2` :
    - **Rôle** (`bouton-secondaire min-h-11`), désactivé si `estSoi` (title « Tu ne peux pas changer ton propre rôle ») ;
    - **Prolonger** (`bouton-secondaire min-h-11`), désactivé si `acces === "aucun"` (title « Aucune clé active à prolonger ») ou `acces === "illimite"` (title « Accès illimité ») ;
    - **Révoquer** (`min-h-11 rounded-full px-3 text-sm text-danger hover:bg-[#FFB5C2]/20`), masqué si `estSoi`, désactivé si `acces === "aucun"`.
- Liste vide : « Aucun compte. » ; recherche sans résultat : « Aucun utilisateur ne correspond. »

Modale rôle :

- titre « Changer le rôle » ;
- deux boutons `min-h-11 flex-1` **Membre** / **Admin**, `aria-pressed` sur le rôle sélectionné, style actif `bg-[#4A6741] text-white` ;
- footer : **Annuler** + **Enregistrer** (`bouton`, libellé « Enregistrement… »), désactivé si rôle inchangé ou attente.

Modale prolongation :

- titre « Prolonger l'accès » ;
- quatre boutons `min-h-11 flex-1` : **+7 jours**, **+30 jours**, **+90 jours**, **Illimité** ; `aria-pressed` sur le choix, défaut `30` ;
- footer : **Annuler** + **Prolonger** (`bouton`, libellé « Prolongation… »).

Modale révocation :

- titre « Révoquer les accès » ;
- texte « Révoquer tous les accès actifs de {nom} ? Cette action coupe l'accès immédiatement. » ;
- footer : **Annuler** + **Révoquer** (bouton danger : `min-h-11 flex-1 rounded-full bg-[#B0413E] px-4 text-sm font-medium text-white disabled:opacity-60`, libellé « Révocation… »).

Utiliser `messageErreur(res, defaut)` pour tous les échecs, et `role="status"` pour les erreurs inline des modales.

- [ ] **Step 5: Vérifier**

Run: `npm run build` → vert, routes `/admin/utilisateurs` et API compilées.
Contrôle manuel après déploiement : rechercher un compte par accent/casse ; changer un rôle (sauf le sien) ; prolonger un accès expiré puis vérifier la nouvelle date ; révoquer un compte à deux clés actives et vérifier qu'il n'a plus accès ; les boutons de son propre compte sont désactivés/masqués.

- [ ] **Step 6: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add "src/app/api/admin/users" "src/app/admin/utilisateurs" src/components/admin/utilisateurs-client.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add admin user and access management"
```

---

### Task 9: Lien Admin dans la navigation

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/components/nav-bar.tsx`

**Interfaces:**
- Consumes: rôle `ADMIN` de la session courante.
- Produces: `NavBar({ estAdmin }: { estAdmin: boolean })` ; icône `Ibouclier`.

- [ ] **Step 1: Lire le rôle dans le layout**

Dans `src/app/(app)/layout.tsx`, après le calcul de `repasSemaine`, ajouter :

```tsx
const utilisateur = userId
  ? await db.user.findUnique({ where: { id: userId }, select: { role: true } })
  : null;
```

Puis remplacer `<NavBar />` par :

```tsx
<NavBar estAdmin={utilisateur?.role === "ADMIN"} />
```

- [ ] **Step 2: Ajouter l'icône et la prop**

Dans `src/components/nav-bar.tsx` :

```tsx
function Ibouclier({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
```

Remplacer la signature :

```tsx
export default function NavBar({ estAdmin }: { estAdmin: boolean }) {
```

- [ ] **Step 3: Lien desktop et icône mobile**

Dans la `<nav>` desktop (`hidden ... sm:flex`), après la boucle `LIENS` et avant `<SelecteurTheme />` :

```tsx
{estAdmin && (
  <Link
    href="/admin"
    aria-label="Panneau admin"
    className="flex min-h-11 items-center gap-1 rounded-full px-4 text-sm font-medium text-[#4A6741] transition hover:bg-[#A8E6CF]/30"
  >
    <Ibouclier className="h-4 w-4" /> Admin
  </Link>
)}
```

Dans le groupe mobile de l'en-tête (`flex items-center gap-1 sm:hidden`), avant `<SelecteurTheme />` :

```tsx
{estAdmin && (
  <Link
    href="/admin"
    aria-label="Panneau admin"
    title="Panneau admin"
    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#4A6741] transition hover:bg-[#A8E6CF]/30"
  >
    <Ibouclier className="h-5 w-5" />
  </Link>
)}
```

La barre d'onglets mobile du bas reste à 3 entrées : le lien admin vit dans l'en-tête pour ne pas casser la grille à 360 px.

- [ ] **Step 4: Vérifier**

Run: `npm run build` → vert.
Contrôle visuel après déploiement : en admin, « Admin » sur desktop et l'icône bouclier sur mobile ; en compte membre, aucun des deux ; aucun débordement à 360 px.

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add "src/app/(app)/layout.tsx" src/components/nav-bar.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add admin link to app navigation"
```

---

### Task 10: Clés en cartes dans le shell

**Files:**
- Modify: `src/components/admin/cles-client.tsx`

**Interfaces:**
- Consumes: routes existantes `/api/admin/keys` et `/api/admin/keys/[id]` (inchangées), `messageErreur` (Task 6).
- Produces: même fonctionnalité (générer, lister, révoquer), présentation en cartes.

- [ ] **Step 1: Partager le helper d'erreur**

Remplacer la fonction locale `erreurDe` par l'import :

```tsx
import { messageErreur } from "@/lib/erreur-api";
```

et remplacer les deux appels `await erreurDe(res, ...)` par `await messageErreur(res, ...)`.

- [ ] **Step 2: Remplacer le tableau par des cartes**

Dans la section « Toutes les clés », remplacer le bloc `<div className="overflow-x-auto">…</div>` par :

```tsx
<ul className="flex flex-col gap-2">
  {initialKeys.map((k) => (
    <li key={k.id} className="rounded-xl border border-bordure p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="break-all font-mono text-xs">{k.code}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-texte-doux">
            <span
              className={`rounded-full px-2 py-0.5 ${STATUT_STYLES[k.statut] ?? "bg-gray-100"}`}
            >
              {k.statut}
            </span>
            <span>{k.durationDays === null ? "Illimitée" : `${k.durationDays} j`}</span>
            <span>
              {k.expiresAt
                ? `Expire le ${new Date(k.expiresAt).toLocaleDateString("fr-FR")}`
                : "Sans expiration"}
            </span>
          </div>
        </div>
        {k.status !== "REVOKED" && (
          <button
            onClick={() => revoquer(k.id)}
            disabled={revocation !== null}
            className="min-h-11 shrink-0 rounded-full px-3 text-xs text-danger hover:bg-[#FFB5C2]/20 disabled:opacity-60"
          >
            {revocation === k.id ? "Révocation…" : "Révoquer"}
          </button>
        )}
      </div>
      {erreurRevocation?.id === k.id && (
        <p role="status" aria-live="polite" className="mt-2 text-xs text-danger">
          {erreurRevocation.message}
        </p>
      )}
    </li>
  ))}
</ul>
```

Conserver l'état vide « Aucune clé pour le moment. » et toute la carte « Nouvelles clés » (génération) inchangée.

- [ ] **Step 3: Vérifier**

Run: `npm run build` → vert.
Contrôle visuel à 360 px : code de clé lisible (retour à la ligne), statut/durée/expiration sur plusieurs lignes si besoin, bouton Révoquer ≥ 44 px, aucun défilement horizontal.

- [ ] **Step 4: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/components/admin/cles-client.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "refactor: present admin keys as mobile cards"
```

---

### Task 11: Vérification finale et déploiement

**Files:** aucun (gate uniquement).

- [ ] **Step 1: Suite complète**

Run: `npm test`
Expected: tous les fichiers verts, ≥ 141 tests (107 + 3 gardes + 7 stats + 13 catégories + 11 accès).

- [ ] **Step 2: Build de production**

Run: `npm run build` (timeout ≥ 600000 ms)
Expected: vert, avec les routes `/admin`, `/admin/cles`, `/admin/categories`, `/admin/utilisateurs`, `/api/admin/categories/[id]`, `/api/admin/categories/[id]/fusionner`, `/api/admin/users/[id]`, `/api/admin/users/[id]/acces`.

- [ ] **Step 3: Vérifier le périmètre**

Run: `"C:\Program Files\Git\cmd\git.exe" diff --stat 941a64a..HEAD -- src tests package.json prisma/schema.prisma`
Expected: uniquement les fichiers de la carte dans `src/` et `tests/` ; `package.json` et `prisma/schema.prisma` absents du diff.

- [ ] **Step 4: Pousser**

Run: `"C:\Program Files\Git\cmd\git.exe" push origin main`
Expected: Vercel redéploie automatiquement.

- [ ] **Step 5: Vérification manuelle en production (téléphone, 360 px)**

1. Le compte ADMIN voit « Admin » (desktop) et le bouclier (mobile) ; un compte membre ne voit rien.
2. `/admin` affiche les 6 chiffres, l'activité sur 6 semaines, le top catégories et les 5 dernières inscriptions, sans débordement.
3. Les quatre onglets défilent horizontalement et marquent la page active.
4. Catégories : renommer vers un nom existant propose la fusion ; fusionner déplace les recettes et supprime la source ; « Autre » ne peut être ni masquée ni fusionnée comme source.
5. Utilisateurs : la recherche ignore accents/casse ; changer un rôle ; prolonger un accès ; révoquer toutes les clés actives d'un compte ; son propre rôle et son propre accès sont protégés.
6. Clés : générer, lire les cartes, révoquer.
7. Aucune page ne déborde horizontalement ; toutes les cibles ≥ 44 px ; chaque action affiche son libellé d'attente.

---

## Notes d'exécution

- **Pas de migration** : tous les champs nécessaires existent (`User.role`, `LicenseKey`, `Categorie`, `MealPlanEntry.date`, `GroceryListItem.checked/masquee`, `Recipe.createdAt`).
- **Pas de nouvelle dépendance** : barres CSS, modales existantes, icônes SVG inline.
- **Limite assumée** : pas d'historique des repas planifiés ni des visites ; l'activité repose sur les dates de création disponibles.
- **Limite assumée** : liste utilisateurs plafonnée à 200, sans pagination.
- **Ordre de tri des catégories** : `localeCompare("fr")` en JavaScript (Prisma ne trie pas selon la locale).
- **Fusion** : la transaction est atomique ; en cas de suppression concurrente, l'erreur Prisma remonte en 500 — acceptable à cette échelle.
- **Chantier suivant** : refonte du planning mobile et multi-éléments par créneau (`MealPlanEntry` a aujourd'hui une contrainte unique `ownerId/date/slot`), hors périmètre de ce plan.


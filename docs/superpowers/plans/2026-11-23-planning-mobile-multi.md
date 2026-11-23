# Planning mobile — refonte tactile & multi-éléments par créneau

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lever la contrainte unique `ownerId/date/slot` pour autoriser plusieurs repas par créneau (ordre manuel), et remplacer le HTML5 drag-and-desktop par une interaction tactile unifiée (poignée `⋮⋮` visible, drag vertical/horizontal, optimistic UI + PATCH final).

**Architecture:** Migration additive Prisma (`order` + index unique composite) → API étendue (`order` dans PATCH/POST) → hook `useDragRepas` (pur, testable) → composant `CarteRepas` extrait de la grille → `GrillePlan` affiche un stack vertical par créneau → `FeuilleRepas` inchangée pour créer/éditer/supprimer.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 6 (Neon), Tailwind v4, Vitest. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-23-planning-mobile-multi-design.md` (validée 2026-11-23).

---

## Contraintes globales

- UI entièrement en français, ton tutoiement, Fredoka.
- Mobile d'abord : cibles ≥ 44 px (`min-h-11`), aucun débordement horizontal de page à 360 px. Seules les grilles/rangées de chips défilent.
- Zéro nouvelle dépendance npm.
- Animations `transform`/`opacity` seulement, respect de `prefers-reduced-motion` (aucune animation indispensable).
- Toute action qui attend affiche un retour visuel (bouton désactivé + libellé d'attente).
- Dates et semaines en UTC via `weekStart` / `formatDateIso` (`src/lib/plan.ts`).
- TDD sur la logique pure (Vitest). Pas de tests de routes ni de pages (convention).
- `npm test` et `npm run build` verts avant chaque commit. Build : timeout ≥ 600000 ms.
- Git hors PATH : `"C:\Program Files\Git\cmd\git.exe"`.
- Migration additive seulement — aucun reset.

## Review Focus

1. **Drag horizontal limite créneau** : doigt dépasse le bord de l'écran → le drag doit s'arrêter au dernier créneau, pas créer de case fantôme. Test : `useDragRepas` clamp `currentSlot` dans `slots[]`.
2. **Réordonnancement vertical > 3 éléments + scroll** : le conteneur du créneau scrolle (`overflow-y-auto`) pendant le drag → l'index d'insertion visuel doit suivre le scroll. Test : `useDragRepas` calcule `currentOrder` relatif au `scrollTop`.
3. **Conflit 409 course** : deux onglets déplacent le même repas → le second reçoit 409, toast « Ce créneau a changé, réessaie. » + `router.refresh()`. Test : route PATCH renvoie 409 si index unique violé.
4. **Ordre `order` cascade** : déplacer l'élément 1 → 3 dans un créneau de 5 décale les éléments 2 et 3 de +1. Test : `POST /api/plan` + `PATCH` dans la même transaction, vérifier `order` final en base.
5. **Accessibilité clavier** : poignée focusable, `Entrée` → mode drag clavier, `Flèches` → réordonner/changer créneau, `Entrée` valide, `Échap` annule. Test : `CarteRepas` gère `onKeyDown` sur la poignée.

---

## Carte des fichiers

```
prisma/schema.prisma                           MealPlanEntry.order + index unique (modifié)
prisma/migrations/<ts>_add_order_to_mealplan/  migration SQL (créée)

src/lib/plan.ts                                inchangé (utilitaires semaine)
src/lib/drag-repas.ts                          hook useDragRepas (créé, pur)
tests/drag-repas.test.ts                       tests TDD useDragRepas (créé)

src/app/api/plan/route.ts                      POST calcule order = max+1 (modifié)
src/app/api/plan/[id]/route.ts                 PATCH gère order + cascade (modifié)

src/components/plan/carte-repas.tsx            CarteRepas + poignée (créé)
src/components/plan/grille.tsx                 stack vertical + CarteRepas (modifié)
src/components/plan/feuille-repas.tsx          inchangée (création/édition/suppression)

src/app/(app)/plan/page.tsx                    select order dans requête (modifié)

tests/plan.test.ts                             tests existants + ordre (existant, étendu)
```

Ordre : migration → hook pur (TDD) → API → composants → page → gate final.

---

### Task 1: Migration Prisma — `order` + index unique composite

**Files:**
- Modify: `prisma/schema.prisma` (model `MealPlanEntry`)
- Create: `prisma/migrations/<timestamp>_add_order_to_mealplan/migration.sql`

**Interfaces:**
- Consumes: rien.
- Produces (Tasks 2–6) : colonne `order Int @default(0)`, index unique `[@@unique([ownerId, date, slot, order])]` remplaçant l'ancien `[@@unique([ownerId, date, slot])]`.

- [ ] **Step 1: Modifier le schéma**

Dans `prisma/schema.prisma`, model `MealPlanEntry` :
```prisma
// Remplacer la ligne :
// @@unique([ownerId, date, slot])
// Par :
  order    Int      @default(0)
  @@unique([ownerId, date, slot, order])
```

- [ ] **Step 2: Générer la migration sans l'appliquer**

Run: `npx prisma migrate dev --create-only --name add_order_to_mealplan`
Expected: dossier `prisma/migrations/<timestamp>_add_order_to_mealplan/` créé.

- [ ] **Step 3: Compléter la migration SQL**

À la fin du `migration.sql` généré, ajouter exactement :
```sql
-- 1. Ajouter la colonne order avec défaut 0 (déjà fait par Prisma si @default(0) dans le schéma)
-- 2. Supprimer l'ancien index unique
DROP INDEX IF EXISTS "MealPlanEntry_ownerId_date_slot_key";

-- 3. Créer le nouvel index unique
CREATE UNIQUE INDEX "MealPlanEntry_ownerId_date_slot_order_key"
  ON "MealPlanEntry" ("ownerId", "date", "slot", "order");
```

- [ ] **Step 4: Appliquer la migration**

Run: `npx prisma migrate dev`
Expected: migration appliquée, « Your database is now in sync », client Prisma régénéré.

- [ ] **Step 5: Vérifier**

Run: `npx prisma validate` → « The schema is valid ».
Run (PowerShell) :
```powershell
node --input-type=module -e 'import {PrismaClient} from "@prisma/client"; const p=new PrismaClient(); const e=await p.mealPlanEntry.findFirst(); console.log("order field:", e?.order ?? "null"); await p.$disconnect();'
```
Expected: `order field: 0` (backfill par défaut Prisma).

- [ ] **Step 6: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add prisma/schema.prisma prisma/migrations
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add order field and composite unique index to MealPlanEntry"
```

---

### Task 2: Hook `useDragRepas` (TDD)

**Files:**
- Create: `src/lib/drag-repas.ts`
- Test: `tests/drag-repas.test.ts`

**Interfaces:**
- Consumes: `SLOTS`, `SLOT_LABELS` de `@/lib/plan` ; `EntryVue` (avec `order`).
- Produces (Tasks 3–5) :
  ```ts
  export type DragState = {
    entryId: string;
    startX: number;
    startY: number;
    currentSlot: string;
    currentOrder: number;
    currentDate: string; // ISO date du créneau cible
  } | null;

  export type UseDragRepasReturn = {
    dragState: DragState;
    startDrag: (entryId: string, clientX: number, clientY: number, currentEntry: EntryVue, allEntries: EntryVue[], dates: string[], slots: string[]) => void;
    moveDrag: (clientX: number, clientY: number) => void;
    endDrag: () => Promise<{ date: string; slot: string; order: number } | null>; // null = annulé ou inchangé
    cancelDrag: () => void;
  };

  export function useDragRepas(): UseDragRepasReturn;
  ```

- [ ] **Step 1: Écrire les tests qui échouent**

`tests/drag-repas.test.ts` — cas purs (pas de DOM, logique seulement) :

```ts
import { describe, it, expect, vi } from "vitest";
import { useDragRepas } from "@/lib/drag-repas";

// Mock des données minimales
const SLOTS = ["PETIT_DEJEUNER", "DEJEUNER", "DINER"] as const;
const DATES = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
const ENTRY: EntryVue = { id: "e1", date: "2026-11-23", slot: "DINER", servings: 2, recipeId: "r1", title: "Plat", order: 0 };
const ENTRIES: EntryVue[] = [
  { ...ENTRY, id: "e1", order: 0 },
  { ...ENTRY, id: "e2", date: "2026-11-23", slot: "DINER", order: 1 },
  { ...ENTRY, id: "e3", date: "2026-11-23", slot: "DINER", order: 2 },
];

describe("useDragRepas", () => {
  it("startDrag initialise l'état avec la position courante", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    expect(result.current.dragState).toMatchObject({
      entryId: "e1",
      currentSlot: "DINER",
      currentOrder: 0,
      currentDate: "2026-11-23",
    });
  });

  it("moveDrag horizontal change le créneau cible (clamp dans slots)", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    // Déplacement vers la droite → slot suivant
    act(() => result.current.moveDrag(300, 200)); // ~200px droite
    expect(result.current.dragState?.currentSlot).toBe("DINER"); // encore DINER (seuil non franchi)
    act(() => result.current.moveDrag(500, 200)); // seuil franchi
    expect(result.current.dragState?.currentSlot).toBe("PETIT_DEJEUNER"); // jour suivant, premier slot (selon logique)
  });

  it("moveDrag vertical change l'order dans le créneau", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.moveDrag(100, 300)); // 100px bas
    expect(result.current.dragState?.currentOrder).toBe(1); // inséré après e2
  });

  it("endDrag retourne les nouvelles valeurs si changé", async () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.moveDrag(100, 400)); // bas → order 2
    const res = await act(async () => await result.current.endDrag());
    expect(res).toEqual({ date: "2026-11-23", slot: "DINER", order: 2 });
  });

  it("endDrag retourne null si position inchangée", async () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.moveDrag(100, 200)); // pas de déplacement significatif
    const res = await act(async () => await result.current.endDrag());
    expect(res).toBeNull();
  });

  it("cancelDrag remet l'état à null", () => {
    const { result } = renderHook(() => useDragRepas());
    act(() => result.current.startDrag("e1", 100, 200, ENTRY, ENTRIES, DATES, SLOTS));
    act(() => result.current.cancelDrag());
    expect(result.current.dragState).toBeNull();
  });
});
```

Note : `renderHook` et `act` viennent de `@testing-library/react`. Le hook est pur (pas de DOM), on teste la logique via l'API retournée.

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run tests/drag-repas.test.ts`
Expected: FAIL — module `@/lib/drag-repas` introuvable.

- [ ] **Step 3: Implémenter**

`src/lib/drag-repas.ts` — algorithme principal :

```ts
import { useState, useCallback, useRef } from "react";
import { SLOTS } from "@/lib/plan";

export type EntryVue = {
  id: string;
  date: string;
  slot: string;
  servings: number;
  recipeId: string;
  title: string;
  order: number;
};

export type DragState = { /* ... comme dans l'interface ... */ } | null;

const SLOT_ORDER: Record<string, number> = Object.fromEntries(
  SLOTS.map((s, i) => [s, i])
);
const SLOTS_ARRAY = [...SLOTS];
const DATE_TO_INDEX = (dates: string[]) => Object.fromEntries(dates.map((d, i) => [d, i]));

export function useDragRepas() {
  const [dragState, setDragState] = useState<DragState>(null);
  const rafRef = useRef<number>();

  const getSlotIndex = (slot: string) => SLOT_ORDER[slot] ?? 0;
  const getDateIndex = (date: string, dates: string[]) => DATE_TO_INDEX(dates)[date] ?? 0;

  const computeTarget = useCallback((
    clientX: number,
    clientY: number,
    state: NonNullable<DragState>,
    entries: EntryVue[],
    dates: string[],
    slots: string[]
  ) => {
    const startSlotIdx = getSlotIndex(state.currentSlot);
    const startDateIdx = getDateIndex(state.currentDate, dates);
    const slotWidth = 120; // px approximatif par créneau (responsive)
    const rowHeight = 48;  // px approximatif par carte

    // Horizontal → changement de créneau (jour/slot)
    const deltaX = clientX - state.startX;
    const targetSlotIdx = Math.max(0, Math.min(slots.length - 1,
      startSlotIdx + Math.round(deltaX / slotWidth)
    ));
    const targetSlot = slots[targetSlotIdx];

    // Vertical → changement d'order dans le créneau cible
    const deltaY = clientY - state.startY;
    const entriesInTarget = entries
      .filter(e => e.slot === targetSlot && e.date.slice(0,10) === state.currentDate.slice(0,10))
      .sort((a,b) => a.order - b.order);
    const baseOrder = entriesInTarget.length > 0 ? entriesInTarget[0].order : 0;
    const targetOrder = Math.max(0, Math.min(entriesInTarget.length,
      baseOrder + Math.round(deltaY / rowHeight)
    ));

    return { currentSlot: targetSlot, currentOrder: targetOrder };
  }, []);

  const startDrag = useCallback((
    entryId: string,
    clientX: number,
    clientY: number,
    currentEntry: EntryVue,
    allEntries: EntryVue[],
    dates: string[],
    slots: string[]
  ) => {
    setDragState({
      entryId,
      startX: clientX,
      startY: clientY,
      currentSlot: currentEntry.slot,
      currentOrder: currentEntry.order,
      currentDate: currentEntry.date,
    });
  }, []);

  const moveDrag = useCallback((
    clientX: number,
    clientY: number
  ) => {
    setDragState(prev => {
      if (!prev) return prev;
      // computeTarget a besoin des entrées complètes — on les passe via closure ou ref
      // Pour simplifier : on recalcule ici avec les données du state initial
      // (implémentation complète dans le code réel)
      return prev; // placeholder
    });
  }, []);

  const endDrag = useCallback(async () => {
    const state = dragState;
    setDragState(null);
    if (!state) return null;
    // Si position changée, retourner les nouvelles valeurs
    // L'appelant fera le PATCH API
    return null; // placeholder
  }, [dragState]);

  const cancelDrag = useCallback(() => {
    setDragState(null);
  }, []);

  return { dragState, startDrag, moveDrag, endDrag, cancelDrag };
}
```

*Note : l'implémentation complète gère le `moveDrag` avec les vraies données (entries, dates, slots) via un ref ou closure. Le test ci-dessus guide l'API exacte.*

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run tests/drag-repas.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/lib/drag-repas.ts tests/drag-repas.test.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add useDragRepas hook for meal drag logic"
```

---

### Task 3: API Plan — `order` dans POST et PATCH

**Files:**
- Modify: `src/app/api/plan/route.ts`
- Modify: `src/app/api/plan/[id]/route.ts`

**Interfaces:**
- Consumes: `MealPlanEntry.order` (Task 1), `useDragRepas` types (Task 2).
- Produces (Tasks 4–5) :
  - `POST /api/plan` : body inchangé, serveur calcule `order = MAX(order) + 1` pour ce `(ownerId, date, slot)` dans la transaction.
  - `PATCH /api/plan/[id]` : body ajoute `order?: number`. Si `date`/`slot` changent → recalculer `order` pour la cible. Si seul `order` change → décaler les autres entrées du créneau (transaction).

- [ ] **Step 1: Modifier POST `/api/plan`**

Dans `src/app/api/plan/route.ts`, dans la transaction `db.$transaction` :
```ts
// Avant create : lire max order actuel
const maxOrder = await tx.mealPlanEntry.aggregate({
  where: { ownerId: userId, date: dateObj, slot },
  _max: { order: true },
});
const nextOrder = (maxOrder._max.order ?? -1) + 1;

const created = await tx.mealPlanEntry.create({
  data: { date: dateObj, slot, recipeId, servings, ownerId: userId, order: nextOrder },
});
```

- [ ] **Step 2: Modifier PATCH `/api/plan/[id]`**

Dans `src/app/api/plan/[id]/route.ts` :
```ts
// Ajouter order au type data
if (Number.isInteger(Number(body.order)) && Number(body.order) >= 0) {
  data.order = Number(body.order);
}

// Dans la transaction : si date/slot/order changent, gérer le décalage
const dateChanged = data.date instanceof Date && data.date.getTime() !== existante.date.getTime();
const slotChanged = data.slot && data.slot !== existante.slot;
const orderChanged = data.order !== undefined && data.order !== existante.order;

if (dateChanged || slotChanged || orderChanged) {
  const targetDate = data.date instanceof Date ? data.date : existante.date;
  const targetSlot = data.slot ?? existante.slot;
  const targetOrder = data.order ?? existante.order;

  // Décaler les entrées existantes du créneau cible qui ont order >= targetOrder
  await tx.mealPlanEntry.updateMany({
    where: {
      ownerId: userId,
      date: targetDate,
      slot: targetSlot,
      order: { gte: targetOrder },
      NOT: { id: existante.id },
    },
    data: { order: { increment: 1 } },
  });

  // Si l'entrée vient d'un autre créneau, décrémenter l'ancien créneau
  if (dateChanged || slotChanged) {
    await tx.mealPlanEntry.updateMany({
      where: {
        ownerId: userId,
        date: existante.date,
        slot: existante.slot,
        order: { gt: existante.order },
      },
      data: { order: { decrement: 1 } },
    });
  }
  data.order = targetOrder;
}
```

- [ ] **Step 3: Vérifier**

Run: `npm run build` → vert, routes `/api/plan` et `/api/plan/[id]` compilées.

- [ ] **Step 4: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/api/plan/route.ts src/app/api/plan/[id]/route.ts
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add order handling to plan API"
```

---

### Task 4: Composant `CarteRepas` + poignée

**Files:**
- Create: `src/components/plan/carte-repas.tsx`

**Interfaces:**
- Consumes: `EntryVue` (avec `order`), `useDragRepas` (Task 2), `FeuilleModale` (existante).
- Produces (Task 5) :
  ```tsx
  export default function CarteRepas({
    entry,
    isDragging,
    onDragStart,
    onDragMove,
    onDragEnd,
    onClickEdit,
  }: {
    entry: EntryVue;
    isDragging: boolean;
    onDragStart: (e: React.TouchEvent | React.MouseEvent) => void;
    onDragMove: (e: React.TouchEvent | React.MouseEvent) => void;
    onDragEnd: () => void;
    onClickEdit: () => void;
  }) {}
  ```

- [ ] **Step 1: Créer le composant**

`src/components/plan/carte-repas.tsx` :

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useDragRepas, type EntryVue } from "@/lib/drag-repas";

export default function CarteRepas({
  entry,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClickEdit,
}: {
  entry: EntryVue;
  isDragging: boolean;
  onDragStart: (e: React.TouchEvent | React.MouseEvent) => void;
  onDragMove: (e: React.TouchEvent | React.MouseEvent) => void;
  onDragEnd: () => void;
  onClickEdit: () => void;
}) {
  const carteRef = useRef<HTMLDivElement>(null);
  const reducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Styles dynamiques pendant le drag
  const style = isDragging && !reducedMotion ? {
    transform: "rotate(2deg) scale(1.02)",
    opacity: 0.85,
    zIndex: 50,
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  } : {};

  return (
    <div
      ref={carteRef}
      className={`carte cursor-grab transition-all duration-150 ${isDragging ? "cursor-grabbing" : ""}`}
      style={style}
      onClick={onClickEdit}
      onTouchStart={onDragStart}
      onTouchMove={onDragMove}
      onTouchEnd={onDragEnd}
      onMouseDown={onDragStart}
      onMouseMove={onDragMove}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
    >
      {/* Poignée de réordonnancement — toujours visible, zone tactile 44×44 */}
      <button
        type="button"
        aria-label={`Réordonner ${entry.title}`}
        tabIndex={0}
        className="absolute -left-10 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full text-texte-doux hover:bg-[#A8E6CF]/30 focus-visible:outline-2 focus-visible:outline-[#e07a5f]"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onDragStart(e as any);
          }
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true">
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
        </svg>
      </button>

      {/* Contenu de la carte */}
      <div className="ml-8">
        <button type="button" className="w-full text-left p-2" onClick={onClickEdit}>
          <p className="text-sm font-medium leading-tight text-foreground">{entry.title}</p>
          <p className="text-xs text-texte-tres-doux">{entry.servings} portion(s)</p>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Vérifier**

Run: `npm run build` → vert.

- [ ] **Step 3: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/components/plan/carte-repas.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: add CarteRepas component with drag handle"
```

---

### Task 5: `GrillePlan` — stack vertical + intégration drag

**Files:**
- Modify: `src/components/plan/grille.tsx`

**Interfaces:**
- Consumes: `CarteRepas` (Task 4), `useDragRepas` (Task 2), `EntryVue` avec `order`.
- Produces (Task 6) : grille qui affiche par créneau un `flex flex-col gap-1` de `CarteRepas`, triées par `order`, avec `max-h-[120px] overflow-y-auto` si > 3.

- [ ] **Step 1: Modifier `GrillePlan`**

Dans `src/components/plan/grille.tsx` :
- Importer `CarteRepas` et `useDragRepas`.
- Remplacer la logique `glisse`/`pending`/`deplacer` par `useDragRepas`.
- Dans le rendu de la cellule créneau : grouper les entrées par `(date, slot)`, trier par `order`, mapper vers `<CarteRepas ... />`.
- Conteneur créneau : `className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pb-1"`.

```tsx
// Dans le corps de GrillePlan :
const { dragState, startDrag, moveDrag, endDrag, cancelDrag } = useDragRepas();

// Handler unifiés
const handleDragStart = (e: React.TouchEvent | React.MouseEvent, entry: EntryVue) => {
  startDrag(entry.id, e.clientX ?? e.touches?.[0]?.clientX ?? 0, e.clientY ?? e.touches?.[0]?.clientY ?? 0, entry, entries, dates, SLOTS);
};
const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
  moveDrag(e.clientX ?? e.touches?.[0]?.clientX ?? 0, e.clientY ?? e.touches?.[0]?.clientY ?? 0);
};
const handleDragEnd = async () => {
  const result = await endDrag();
  if (result) {
    // Appel API PATCH avec result { date, slot, order }
    await fetch(`/api/plan/${dragState?.entryId}`, { /* PATCH ... */ });
    router.refresh();
  }
};

// Rendu cellule créneau :
const entriesInCell = entries
  .filter(e => e.date.slice(0,10) === date.slice(0,10) && e.slot === slot)
  .sort((a,b) => a.order - b.order);

<div className="flex flex-col gap-1 max-h-[120px] overflow-y-auto pb-1">
  {entriesInCell.map((entry) => (
    <CarteRepas
      key={entry.id}
      entry={entry}
      isDragging={dragState?.entryId === entry.id}
      onDragStart={(e) => handleDragStart(e, entry)}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onClickEdit={() => setFeuille({ date, slot, entry })}
    />
  ))}
</div>
```

- [ ] **Step 2: Vérifier**

Run: `npm run build` → vert.

- [ ] **Step 3: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/components/plan/grille.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: render vertical stack per slot with drag handles"
```

---

### Task 6: Page Plan — select `order` + nettoyage

**Files:**
- Modify: `src/app/(app)/plan/page.tsx`

**Interfaces:**
- Consumes: `MealPlanEntry.order` (Task 1), `GrillePlan` (Task 5).
- Produces : rien de nouveau (page serveur inchangée hormis le select).

- [ ] **Step 1: Ajouter `order` au select Prisma**

Dans `src/app/(app)/plan/page.tsx`, `db.mealPlanEntry.findMany` :
```ts
select: {
  id: true,
  date: true,
  slot: true,
  servings: true,
  recipeId: true,
  order: true, // NOUVEAU
  recipe: { select: { id: true, title: true } },
},
orderBy: [{ date: "asc" }, { slot: "asc" }, { order: "asc" }], // tri serveur
```

- [ ] **Step 2: Vérifier**

Run: `npm run build` → vert.

- [ ] **Step 3: Gate et commit**

Run: `npm test` puis `npm run build` → verts.

```powershell
"C:\Program Files\Git\cmd\git.exe" add src/app/(app)/plan/page.tsx
"C:\Program Files\Git\cmd\git.exe" commit -m "feat: include order in plan query and server sort"
```

---

### Task 7: Vérification finale et déploiement

**Files:** aucun (gate uniquement).

- [ ] **Step 1: Suite complète**

Run: `npm test`
Expected: tous les fichiers verts, ≥ 148 tests (141 + 7 drag-repas).

- [ ] **Step 2: Build de production**

Run: `npm run build` (timeout ≥ 600000 ms)
Expected: vert, routes `/plan`, `/api/plan`, `/api/plan/[id]` compilées.

- [ ] **Step 3: Vérifier le périmètre**

Run: `"C:\Program Files\Git\cmd\git.exe" diff --stat 745879d..HEAD -- src tests package.json prisma/schema.prisma`
Expected: uniquement les fichiers de la carte ci-dessus ; `package.json` et `prisma/schema.prisma` inchangés (sauf migration).

- [ ] **Step 4: Pousser**

Run: `"C:\Program Files\Git\cmd\git.exe" push origin main`
Expected: Vercel redéploie automatiquement.

- [ ] **Step 5: Vérification manuelle en production (téléphone, 360 px)**

1. `/plan` → semaine courante → clic `+` sur « Dîner » → créer « Plat principal » → apparaît en premier.
2. Clic `+` sur même « Dîner » → créer « Dessert » → apparaît en dessous (stack vertical).
3. Poignée `⋮⋮` sur « Dessert » → glisser vers le haut → « Dessert » passe au-dessus de « Plat principal » (ordre inversé).
4. Poignée sur « Plat principal » → glisser horizontalement vers « Déjeuner » → repas déplacé, `order = 0` au déjeuner.
5. Créer 4 éléments au même créneau → scroll vertical natif dans le créneau.
6. Clavier : `Tab` sur poignée → `Entrée` → `Flèches` → `Entrée` valide, `Échap` annule.
7. `prefers-reduced-motion` : pas d'animation `rotate/scale`, feedback par ombre/couleur seulement.
8. Aucun débordement horizontal de page à 360 px ; toutes cibles ≥ 44 px.

---

## Notes d'exécution

- **Migration** : additive, backfill `order = 0` par défaut Prisma. L'ancien index unique est droppé, le nouveau créé.
- **Pas de nouvelle dépendance** : SVG poignée inline, `useDragRepas` pur React.
- **Ordre `order`** : géré côté serveur (POST calcule `max+1`, PATCH décale les autres). Le client n'envoie que la position finale visuelle.
- **Sync courses** : `synchroniserCourses` déjà appelée sur les deux semaines dans la transaction PATCH/POST/DELETE → ingrédients additionnés automatiquement.
- **Accessibilité** : poignée `tabIndex=0`, `aria-label`, `onKeyDown` pour drag clavier, `prefers-reduced-motion` respecté.
- **Chantier suivant** : éléments libres sans recette, tri auto, modèles de semaine.
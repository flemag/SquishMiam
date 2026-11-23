# Planning mobile — refonte tactile & multi-éléments par créneau

Date : 2026-11-23  
Statut : validé (suite du panneau admin)  
Contexte : le planning actuel permet 1 seul repas par créneau (contrainte unique `ownerId_date_slot`), le glisser-déposer HTML5 ne fonctionne qu'en desktop, et la manipulation au doigt est imparfaite.

---

## Intention et pourquoi

Steve utilise l'app sur téléphone (360 px) en production. Aujourd'hui :
- Au dîner, impossible d'avoir un plat **et** un dessert → un seul `MealPlanEntry` par `(date, slot)`.
- Le glisser-déposer desktop (`draggable`/`onDragOver`) est inerte au toucher mobile.
- La feuille de repas (`FeuilleRepas`) marche bien pour créer/éditer, mais le déplacement demande d'ouvrir la feuille, changer jour/service, valider — trop d'étapes au doigt.

Objectif : **confort tactile natif** (pas de HTML5 DnD) + **plusieurs éléments par créneau** (repas + dessert + …), ordre manuel par l'utilisateur.

---

## Objectifs

1. **Modèle** : lever la contrainte unique → `order` (entier) + index unique `(ownerId, date, slot, order)`. Migration additive, backfill `order = 0`.
2. **Affichage** : dans chaque créneau, **stack vertical de cartes** (hauteur auto, scroll si > 3). Ordre = `order` croissant.
3. **Interaction mobile** :
   - Poignée `⋮⋮` visible sur chaque carte (mobile + desktop).
   - Appui sur poignée → mode « réordonnancement » : la carte suit le doigt verticalement (dans le créneau) ou horizontalement (vers autre créneau).
   - Relâcher → `PATCH /api/plan/{id}` avec nouveau `date`, `slot`, `order` (une seule requête).
   - FeuilleRepas inchangée pour créer/éditer portions/recette/supprimer.
4. **Desktop** : même poignée, même comportement (pas de HTML5 DnD natif).
5. **Sync courses** : si plusieurs recettes même créneau, leurs ingrédients s'additionnent (déjà le cas via `synchroniserCourses` sur la semaine).

---

## Non-objectifs

- Éléments libres sans recette (« Restes », « Extérieur ») — plus tard.
- Tri automatique (alpha, durée) — l'utilisateur ordonne manuellement.
- D&D HTML5 — remplacé par geste tactile unifié.
- Pagination dans un créneau — scroll natif suffit (peu d'éléments réels).

---

## Contraintes héritées

- Next.js 15 / React 19 / TypeScript / Prisma / Tailwind v4, zéro nouvelle dépendance.
- Mobile 360 px : cibles ≥ 44 px, aucun débordement horizontal de page.
- Animations `transform`/`opacity` + `prefers-reduced-motion`.
- UI française, ton tutoiement, Fredoka.
- TDD sur logique pure (Vitest), `npm test` + `npm run build` verts avant chaque commit.
- Migration additive seulement.

---

## Modèle de données

```prisma
model MealPlanEntry {
  id       String   @id @default(cuid())
  date     DateTime @db.Date
  slot     MealSlot
  servings Int      @default(2)
  recipeId String
  recipe   Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  ownerId  String
  owner    User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  order    Int      @default(0)  // NOUVEAU

  @@unique([ownerId, date, slot, order])  // REMPLACE l'ancien @@unique([ownerId, date, slot])
}
```

Migration (générée puis complétée) :
```sql
-- 1. Ajouter la colonne order avec défaut 0
ALTER TABLE "MealPlanEntry" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- 2. Supprimer l'ancien index unique
DROP INDEX "MealPlanEntry_ownerId_date_slot_key";

-- 3. Créer le nouvel index unique
CREATE UNIQUE INDEX "MealPlanEntry_ownerId_date_slot_order_key"
  ON "MealPlanEntry" ("ownerId", "date", "slot", "order");
```

---

## API

### `PATCH /api/plan/{id}` — étendu

Body ajoute `order?: number` (entier ≥ 0). Logique serveur :
- Si `date` ou `slot` changent : recalculer `order` pour la nouvelle position (insérer à la fin du créneau cible par défaut, ou à l'index fourni).
- Si seul `order` change dans le même créneau : décaler les autres entrées (`order >= nouvelleVal`) de +1 ou -1 pour faire de la place (transaction).
- Conflit 409 si `(ownerId, date, slot, order)` existe déjà (course condition).

### `POST /api/plan` — création

`order` calculé côté serveur = `MAX(order) + 1` pour ce `(ownerId, date, slot)` (dans la même transaction).

### `GET /api/plan?weekStart=...`

Retourne `entries` triées par `date`, `slot`, `order` (déjà le cas si on ordonne en SQL).

---

## Composants UI

### `GrillePlan` (modifié)
- `EntryVue` gagne `order: number`.
- Dans chaque cellule créneau : **stack vertical** (`flex flex-col gap-1`) des cartes triées par `order`.
- Chaque carte affiche sa poignée `⋮⋮` (`aria-label="Réordonner"`).
- Si > 3 cartes : `max-h-[120px] overflow-y-auto` sur le conteneur du créneau.

### `CarteRepas` (nouveau composant extrait de la grille)
Props : `entry`, `isDragging`, `onDragStart`, `onDragMove`, `onDragEnd`, `onClickEdit`.
- Poignée `⋮⋮` : `touch-action: none`, `onTouchStart`/`onMouseDown` → déclenche le drag.
- Pendant le drag : carte `opacity-50 rotate-2 scale-[1.02]` (transform), `z-50`.
- Drop zone visuelle : contour pointillé vert sur le créneau cible.

### `useDragRepas` (hook pur, testable)
Logique :
- `start(entryId, clientX, clientY)` → calcule offset, met en état `dragging: { entryId, startX, startY, currentSlot, currentOrder }`.
- `move(clientX, clientY)` → détermine le créneau cible (horizontal) et l'index d'insertion (vertical) → met à jour `currentSlot`, `currentOrder` (optimistic UI).
- `end()` → si position changée → `PATCH /api/plan/{entryId}` `{ date, slot, order }` → `router.refresh()`.

Respecte `prefers-reduced-motion` : pas d'animation, juste saut final.

### `FeuilleRepas` (inchangée côté création/édition/suppression)
- S'ouvre toujours au clic sur le corps de la carte (pas la poignée).
- Champs « Déplacer vers » (select jour/service) conservés comme alternative clavier/accessibilité.

---

## Détails UX

| Situation | Comportement |
|-----------|--------------|
| Créneau vide | Zone `+` existante (ouvre FeuilleRepas). |
| 1 élément | Carte + poignée. |
| 2–3 éléments | Stack vertical, toutes visibles. |
| 4+ éléments | Stack + scroll vertical natif (`overflow-y-auto`, hauteur max ~120px). |
| Drag vertical dans créneau | Réordonne `order` localement (optimistic), 409 si conflit à la fin. |
| Drag horizontal vers autre créneau | Change `slot` et/ou `date`, `order = fin du créneau cible` (ou index visuel). |
| Annulation drag (Échap, clic hors zone) | Retour état initial, pas d'appel API. |
| Conflit 409 (course) | Toast « Ce créneau a changé, réessaie. » + `router.refresh()`. |

---

## Accessibilité

- Poignée : `role="button"`, `aria-label="Réordonner ce repas"`, `tabIndex=0`, focus visible.
- Clavier : `Tab` → poignée, `Entrée/Espace` → mode drag clavier (`Flèche Haut/Bas` = réordonner, `Flèche Gauche/Droite` = changer créneau, `Entrée` = valider, `Échap` = annuler).
- `prefers-reduced-motion` : pas d'animation `transform`, feedback visuel par couleur/ombre seulement.
- Écran lecteur : « Repas X, poignée de réordonnancement » + annonce de position à la fin du drag (`aria-live="polite"`).

---

## Sync courses (inchangé)

`synchroniserCourses(tx, userId, [dateOrigine, dateCible])` est déjà appelée dans la transaction `PATCH`/`POST`/`DELETE`. Elle agrège les ingrédients de **toutes** les entrées de la semaine → pas de changement nécessaire.

---

## Migration & déploiement

1. Migration Prisma (additive, pas de reset).
2. `prisma migrate dev` → client régénéré.
3. Code : nouveaux champs `order` dans types, API, composants.
4. Tests : `npm test` (existants + nouveaux pour `useDragRepas` + réordonnancement).
5. `npm run build` vert.
6. Push → Vercel déploie.
7. Vérification téléphone 360 px : créer 2 plats au dîner, réordonner au doigt, déplacer un déjeuner vers le dîner.

---

## Risques et dette acceptée

- **Conflit `order` concurrent** : deux utilisateurs (ou deux onglets) déplacent au même moment → 409 défensif + refresh. Acceptable (usage personnel).
- **Décalage `order` en cascade** : déplacer l'élément 1 → 3 décale 2 et 3. Transaction Prisma unique, OK.
- **Pas de pagination créneau** : si un jour il y a 20 éléments, le scroll natif suffit.
- **Pas d'éléments sans recette** : exclu du périmètre.
- **Pas de tri auto** : l'utilisateur gère son ordre.

---

## Ce qui reste au builder

- Extraction exacte de `CarteRepas` (factorisation grille/feuille).
- Implémentation `useDragRepas` (Touch + Mouse unifiés, `requestAnimationFrame` pour fluidité).
- Styles poignée : `⋮⋮` SVG inline, 24×24, zone tactile 44×44.
- Tests Vitest : `useDragRepas` (calcul index insertion, détection créneau cible), réordonnancement cascade.
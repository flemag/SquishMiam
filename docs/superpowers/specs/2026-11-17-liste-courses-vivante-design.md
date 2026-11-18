# Design — Liste de courses vivante et interactive (Miamz)

Date : 2026-11-17 · Auteur : session superpowers (OpenCode) · Décideur : Steve

## Intent et pourquoi

Steve veut que **la liste de courses vive avec le planning** : toute modification ou
suppression d'un repas dans le planning se répercute immédiatement sur la liste de la
semaine concernée, sans bouton. Et il veut une **liste pleinement interactive** :
ajout manuel d'un article, édition de quantité, suppression d'une ligne (le cochage existe déjà).

Ce plan est le **chantier 1** du volet IA révisé. Le compagnon n'aura **pas de chat**
(décision Steve du 17/11) : ses réactions IA automatiques font l'objet du chantier 2,
juste après, par-dessus cette fondation. Les briques « import d'URL », « photo du frigo »
et « aide à la rédaction de recettes » restent **en attente** (ni abandonnées, ni planifiées).

## Contexte décisionnel (amendement au doc maître)

- 2026-11-17 — Steve retire la surface de chat du programme. L'IA se manifestera
  uniquement par des **réactions automatiques contextuelles** (bulles du compagnon,
  humeur synchronisée, cache, mode dégradé — décisions du doc maître conservées).
- Ordre retenu : **liste vivante** → **réactions IA** → (en attente : import URL,
  photo frigo, aide rédaction, rapports hebdo, jardin/XP).

## Goals

1. Créer, modifier (date, créneau, portions, recette) ou supprimer un repas dans le
   planning met la liste de courses de la semaine concernée à jour **automatiquement,
   côté serveur**.
2. Modifier ou supprimer une recette utilisée dans des plannings met à jour les listes
   des semaines concernées.
3. La liste est interactive : ajout manuel, édition de quantité, suppression de ligne,
   cochage (existant).
4. L'état coché d'une ligne survit aux recalculs tant que la ligne reste nécessaire.
5. Les lignes ajoutées à la main ne sont jamais altérées, masquées ni supprimées par le recalcul.

## Non-goals

- Pas de mise à jour temps réel inter-clients (WebSocket) : la page courses relit la
  base à chaque navigation (pattern actuel).
- Pas d'IA dans ce plan (chantier 2).
- Pas de partage foyer ni de liste multi-semaines.

## Anti-goals (échecs même si ça « marche »)

- Perdre le cochage d'une ligne encore nécessaire lors d'un recalcul.
- Recréer une ligne que l'utilisateur vient de supprimer alors que le planning n'a pas bougé.
- Écraser ou supprimer une ligne saisie à la main.

## Contraintes

- **Zéro nouvelle dépendance npm.**
- Mobile d'abord (360 px), cibles tactiles ≥ 44 px, safe-area, pas de débordement
  horizontal (la grille hebdo seule peut scroller).
- TDD sur la logique pure (Vitest). `npm test` + `npm run build` verts avant chaque commit.
- UI française, police Fredoka, classes sémantiques des thèmes
  (`.carte`, `.bouton`, `.bouton-secondaire`, `.champ`, `.puce`).
- Animations transform/opacity uniquement ; `prefers-reduced-motion` coupe tout.

## Approches considérées (mécanisme de synchronisation)

1. **Projection recalculée + lignes sourcées (choisi).** Chaque ligne porte sa source
   (`PLAN` ou `MANUEL`). À toute mutation concernante, on recalcule la projection de la
   semaine depuis le planning (agrégation pure existante) et on **réconcilie** les lignes
   en base : créer / mettre à jour / purger. Déterministe, testable à fond, zéro dérive :
   la liste est toujours « planning + manuel ».
2. **Deltas incrémentaux sans marquage (rejeté).** Réagir à chaque événement en ajustant
   les lignes à la main duplique `aggregateGroceries` en moins fiable : les ingrédients
   partagés entre repas rendent tout delta local invivable (supprimer un repas doit
   décrémenter, pas effacer).
3. **Liste 100 % calculée à la volée, sans table (rejeté).** L'état coché, les lignes
   manuelles et les semaines passées n'auraient aucun domicile persistant.

## Schéma (Prisma + migration)

- `GroceryListItem.source` : nouvel enum Prisma `GroceryItemSource { PLAN MANUEL }`,
  défaut `PLAN`. Les lignes existantes (créées par le bouton « Générer ») deviennent `PLAN`.
- `GroceryListItem.masquee` : `Boolean @default(false)`.
- La contrainte unique existante `(ownerId, weekStart, nom, unite)` est conservée.

## Règles de réconciliation (semaine W, un utilisateur)

Projection P = `aggregateGroceries(repas de W)` → clés `k = nom(minuscule)|unite`
avec quantité (scalée par les portions) et rayon (dictionnaire existant).

Pour les lignes en base de W :

- **MANUEL** : jamais touchées (ni créées, ni modifiées, ni supprimées).
  - **Bouclier** : si une ligne MANUELLE existe avec la clé `k ∈ P`, la réconciliation
    **ne crée pas** de ligne PLAN pour `k` (le besoin est déjà couvert par la même
    ligne physique). Si la ligne manuelle est ensuite supprimée, la prochaine sync
    recrée la ligne PLAN si toujours nécessaire.
- **PLAN avec `k ∈ P`** : quantité et rayon mis à jour vers P[k], même si la ligne est
  masquée. L'état coché est préservé.
- **PLAN avec `k ∉ P`** : supprimée définitivement (même masquée).
- **PLAN absente de la base avec `k ∈ P`** (et `k` non bouclée par une ligne manuelle) :
  créée. Une ligne masquée existe toujours en base : sa clé ne déclenche donc jamais
  de recréation.

Conséquences vérifiées :

- Supprimer un repas → ses ingrédients exclusifs disparaissent (cochés ou non), ceux
  partagés avec d'autres repas sont décrémentés.
- Modifier les portions → quantités recalculées (ratio `entry.servings / recipe.servings`).
- Supprimer une ligne PLAN dans l'UI → **masquée** : invisible, non recréée tant qu'elle
  existe en base, mais ses quantités continuent de suivre le planning ; purgée si le
  planning ne la nécessite plus. Un compteur discret « N article(s) masqué(s) — afficher »
  permet de la réafficher.
- Lignes manuelles → immuables par le recalcul, suppression définitive.

## Déclencheurs de synchronisation (côté serveur, dans les route handlers)

- `POST /api/plan` (création d'un repas) → semaine de la date créée.
- `PATCH /api/plan/[id]` → semaine de l'entrée ; si la date change, les semaines
  **avant et après**.
- `DELETE /api/plan/[id]` → semaine de l'entrée supprimée.
- `PATCH /api/recipes/[id]` (si ingrédients ou servings changent) → toutes les semaines
  contenant au moins un repas avec cette recette (`weekStart` distincts).
- `DELETE /api/recipes/[id]` → les entrées cascadent (supprimées par la base) : collecter
  leurs semaines **avant** le delete, resynchroniser après.
- **Nettoyage** : l'ancien endpoint `DELETE /api/plan` (par paramètres `date` + `slot`,
  plus appelé par aucune interface) est **supprimé** dans ce plan — une seule voie de
  suppression, l'invariant « la liste ne peut jamais mentir sur le planning » devient
  étanche. (Appel tranché pendant la revue de conception, 2026-11-17.)
- Chaque réconciliation s'exécute **dans la même transaction Prisma** que la mutation
  (`db.$transaction`) : si la sync échoue, la mutation échoue — la liste ne peut jamais
  mentir sur le planning.

## Logique pure (TDD)

- Nouvelle fonction pure `reconcilerListe(existantes, projection)` →
  `{ aCreer, aMettreAJour, aSupprimer }` implémentant les règles ci-dessus.
  Tests table-driven : partage d'ingrédients, bouclier manuel, masquage, purge,
  quantités `null` (« 1 pincée »), arrondis, casse des noms.
- La projection réutilise `aggregateGroceries` (déjà testée) — aucun doublon de logique.
- Fichier suggéré : `src/lib/reconciliation-courses.ts` (le builder tranche si
  extension de `src/lib/courses.ts` est plus propre).

## API

- `PATCH /api/courses/[id]` : étendu — `checked` (existant) et `quantite` éditables ;
  `nom`, `unite`, `rayon` éditables **uniquement** sur une ligne MANUELLE. La quantité
  d'une ligne PLAN reste éditable mais sera réécrasée au prochain recalcul (documenté
  dans l'UI).
- `DELETE /api/courses/[id]` : MANUELLE → suppression définitive ; PLAN → `masquee: true`.
  La réponse indique le traitement effectué.
- `POST /api/courses/item` : création d'une ligne MANUELLE (nom requis, quantité/unité
  optionnelles, rayon proposé via `mapToRayon` mais modifiable). **Gestion des collisions**
  (clé `nom(minuscule)|unite` déjà présente dans la semaine) :
  - collision avec une ligne **visible** (PLAN ou MANUELLE) → `409` « Déjà dans la liste
    pour cette semaine » (l'unique contrainte en base l'impose de toute façon ; l'UI
    affiche le message, pas d'erreur brute) ;
  - collision avec une ligne PLAN **masquée** → **conversion** : la ligne masquée devient
    la ligne MANUELLE demandée (source `MANUEL`, quantité/unité/rayon de l'utilisateur,
    `masquee: false`, `checked: false`). Relire un article à la main = reprendre la main
    sur la ligne ; elle quitte définitivement la gestion du planning (le bouclier
    s'applique ensuite).
- `PATCH` avec `{ masquee: false }` pour réafficher une ligne PLAN masquée.
- `POST /api/courses` (« Générer depuis le plan ») : conservé tel quel, crée désormais
  des lignes `source: PLAN` explicites. Reste utile pour les semaines anciennes jamais
  resynchronisées.

## UI (mobile d'abord, 360 px)

- Ligne : cochage (existant) + édition de quantité + suppression, cibles ≥ 44 px.
  Édition de quantité : saisie numérique (pattern `.champ`) dans une petite feuille ou
  inline — au choix du builder selon la place.
- Un ajout manuel passe par « + Ajouter un article » en bas de liste : nom, quantité,
  unité, rayon auto-proposé.
- Les lignes PLAN masquées : rangée discrète « N article(s) masqué(s) — afficher » en bas.
- Optimisme sur le cochage (existant) ; ajout/édition/suppression avec retour visuel et
  rollback sur erreur (pattern 409 existant).
- Miamz : l'événement `course-cochee` existant est conservé. Pas de nouvelle bulle dans
  ce plan (les réactions IA viennent au chantier 2).

## Ce qui reste au builder

- Placement exact des transactions et forme exacte du plan de réconciliation.
- Micro-copy française.
- Détails d'implémentation de l'optimisme et du `router.refresh()` (pattern existant).
- Choix feuille modale vs inline pour l'édition de quantité (selon la place à 360 px).

## Critères de réussite (validation Steve sur téléphone)

1. Modifier les portions d'un repas → la liste affiche les nouvelles quantités, sans
   aucun bouton.
2. Supprimer un repas → ses ingrédients uniques disparaissent, les partagés décrémentent.
3. Supprimer une ligne plan → elle disparaît et ne revient pas tant que le planning de
   la semaine ne bouge pas.
4. Une ligne ajoutée à la main survit à tous les recalculs.
5. Le cochage est conservé après n'importe quelle mutation du planning.

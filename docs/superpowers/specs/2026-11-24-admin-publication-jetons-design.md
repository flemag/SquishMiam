# Admin — publication libre et gestion des jetons — design

Date : 2026-11-24
Statut : proposé (en attente d'approbation)
Choix retenus : publication de ses recettes + modération ; onglet Jetons complet (C2)

## Intention

L'admin ne doit pas attendre 3 validations pour publier ses recettes, et doit
pouvoir modérer la boutique. Les jetons doivent avoir une gestion aussi complète
que les clés : voir les soldes, créditer/débiter avec un motif, consulter
l'historique.

## Partie A — Publication

### Règles

- **Recette de l'admin** : le bouton « Publier » existant la rend immédiatement
  visible (`isPublic`, `publishedAt`, `validatedAt = now`). Le retrait nettoie
  tout, comme aujourd'hui.
- **Modération** : l'admin peut forcer la publication ou retirer n'importe
  quelle recette depuis `/admin/boutique`.
- Statuts affichés : `privée` (non publique), `en attente` (publique sans
  validation), `publiée` (publique + validée).

### API

- `POST /api/recipes/[id]/publish` : charge le rôle ; si `ADMIN`, ajoute
  `validatedAt: now` à la publication.
- `GET /api/admin/recipes?recherche=` : liste (titre, auteur, statut, validations,
  dates), recherche titre/auteur, 100 max.
- `PATCH /api/admin/recipes/[id]` `{ publie: boolean }` :
  - `true` → `isPublic`, `publishedAt` (si absent), `validatedAt = now` ;
  - `false` → `isPublic: false`, `publishedAt/validatedAt = null`,
    `validationCount = 0`, `validators = []`, `sharedWith = []`.
- Toutes les routes admin restent protégées par `guards.ts`.

### UI — `/admin/boutique`

- Onglet « Boutique » dans `onglets-admin.tsx`.
- Recherche, cartes (mobile) / lignes (desktop) : titre, auteur, badge de statut,
  nombre de validations, boutons « Publier d'office » / « Retirer ».
- Confirmation avant retrait ; retour visuel pendant l'appel.

## Partie B — Jetons

### API

- `GET /api/admin/tokens?recherche=&motif=` :
  - utilisateurs (id, nom, email, rôle, solde), 100 max ;
  - 100 dernières transactions (date, utilisateur, montant signé, motif, recette).
- `POST /api/admin/tokens` `{ userId, amount, reason }` :
  - montant entier non nul, `|amount| ≤ 1000` ;
  - motifs autorisés : `bonus`, `correction`, `geste` ;
  - débit refusé (409) si le solde deviendrait négatif ;
  - transaction atomique : mise à jour du solde + `TokenTransaction` signée.

### Logique pure — `src/lib/jetons-admin.ts` (TDD)

- `MOTIFS_JETONS` et libellés français.
- `validerMouvement({ amount, reason, solde })` → `{ ok: true, amount, reason }`
  ou `{ ok: false, raison }` (montant invalide, motif inconnu, solde insuffisant).
- `libelleMotif(reason)` tolérant (motifs historiques `validation`, `achat`).

### UI — `/admin/jetons`

- Encart règles : « 1 jeton par validation, plafond 10 ; les gestes admin ne
  comptent pas dans le plafond ».
- Recherche utilisateur, sélection, montant, motif, bouton « Appliquer ».
- Retour visuel + solde mis à jour.
- Historique filtrable (utilisateur / motif), montants colorés (+ vert, − corail).
- Mobile : cartes empilées, aucune table qui déborde.

## Non-objectifs

- Pas de dépense de jetons dans la boutique (C3, plus tard).
- Pas de suppression d'historique, pas de remboursement automatique.
- Pas de modification du plafond par l'admin (constante applicative).

## Anti-objectifs

- Un admin qui peut rendre un solde négatif par erreur.
- Un historique illisible ou sans motif.
- Une publication modérée qui laisse des compteurs incohérents.

## Ce qui reste au bâtisseur

Libellés des statuts, ordre des colonnes, textes de confirmation, style exact
des badges, pagination au-delà de 100 lignes.

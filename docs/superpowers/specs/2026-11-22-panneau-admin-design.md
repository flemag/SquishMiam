# Panneau admin riche & statistiques — design

Date : 2026-11-22
Statut : validé par Steve le 2026-11-22
Chantier suivant : refonte du planning mobile et multi-éléments par créneau (hors périmètre).

## Intention et pourquoi

Steve est le seul administrateur. Aujourd'hui, l'admin se résume à `/admin/cles` : générer, lister et révoquer des clés d'activation. La page n'est pas liée depuis l'application, il n'y a ni vue d'ensemble, ni gestion des catégories, ni gestion des accès utilisateurs. Pour savoir combien de comptes utilisent l'app, quelles catégories prolifèrent ou qui doit être prolongé, il faut aujourd'hui ouvrir la base.

Le panneau admin doit devenir le poste de pilotage personnel de Steve : **comprendre l'usage en un coup d'œil, ranger le contenu, gérer les accès**, sans SQL et sans quitter le téléphone.

## Objectifs

1. Un shell `/admin` avec une navigation claire : **Vue d'ensemble · Clés · Catégories · Utilisateurs**, plus un retour vers l'app.
2. Une vue d'ensemble avec les chiffres utiles et une activité sur 6 semaines.
3. La gestion des catégories promise par la spec du sélecteur : **renommer, masquer/afficher, fusionner** avec réaffectation des recettes.
4. La gestion des utilisateurs : liste, recherche, **changement de rôle**, **prolongation** et **révocation** de l'accès.
5. Un accès discret à l'admin depuis la navigation de l'app, visible uniquement pour un compte ADMIN.
6. Mobile d'abord : une tâche par écran, cibles ≥ 44 px, aucun débordement horizontal de page, UI française.
7. Corriger la garde des routes `/api/admin/*` dans `routeGuard`, avec un test dédié.

## Non-objectifs

- Modération des recettes (édition ou suppression par l'admin).
- Création manuelle de catégories depuis l'admin (la création libre existe déjà via le formulaire de recette).
- Journal d'événements, utilisateurs actifs par jour, rétention.
- Boutique, jetons, validation communautaire (chantier suivant).
- Emails, notifications, suppression de comptes, export de données.
- Pagination : la liste des utilisateurs est plafonnée à 200 et filtrée côté client.
- Toute migration de base ou nouvelle dépendance npm.

## Contraintes héritées

- Next.js 15 / React 19 / TypeScript / Prisma / Tailwind v4, zéro nouvelle dépendance.
- Les pages de données sont des composants serveur ; les actions passent par des routes API puis `router.refresh()`, comme `cles-client.tsx` aujourd'hui.
- TDD sur la logique pure (Vitest). Pas de tests de routes ni de pages (convention projet).
- `npm test` et `npm run build` verts avant chaque commit ; déploiement incrémental après revue.
- Migrations additives uniquement — aucune migration n'est nécessaire ici.
- Le middleware protège les pages `/admin/*`, mais **pas encore** les routes `/api/admin/*` : `routeGuard` ne teste que le préfixe `/admin`. Ce chantier corrige cette lacune (contrôle ADMIN pour les deux préfixes) et ajoute un test de garde. Chaque page et chaque route refait de toute façon le contrôle ADMIN (défense en profondeur).

## Approches considérées

### 1. Pages serveur séparées + API d'actions — retenue

Un layout admin, une page serveur par onglet, des agrégats Prisma calculés à la volée, des routes API pour les mutations et `router.refresh()` après succès.

- **Pour** : cohérent avec l'existant, pages légères, données toujours fraîches, une tâche par écran sur mobile, aucune logique d'auth dupliquée.
- **Contre** : plusieurs fichiers ; changer d'onglet recharge les chiffres.

### 2. Dashboard unique à onglets clients — rejetée

Un seul composant client avec tous les onglets et toutes les données chargées d'un coup.

- **Pour** : transitions instantanées.
- **Contre** : gros composant client, état et erreurs à gérer partout, stats figées, auth dupliquée. Moins robuste sur mobile.

### 3. Pages serveur + cache 60 s — rejetée

Comme l'approche 1 avec des agrégats mis en cache.

- **Pour** : moins de requêtes base.
- **Contre** : chiffres périmés juste après une action, invalidation à maintenir. Inutile à l'échelle d'un usage personnel.

## Structure des routes et fichiers

```
src/app/admin/layout.tsx                  shell + contrôle ADMIN
src/app/admin/page.tsx                    vue d'ensemble (serveur)
src/app/admin/cles/page.tsx               clés (existant, refactoré)
src/app/admin/categories/page.tsx         catégories (serveur)
src/app/admin/utilisateurs/page.tsx       utilisateurs (serveur)

src/components/admin/onglets-admin.tsx    onglets actifs (client)
src/components/admin/cles-client.tsx      existant, liste en cartes
src/components/admin/categories-client.tsx
src/components/admin/utilisateurs-client.tsx

src/app/api/admin/categories/[id]/route.ts           PATCH renommer / masquer
src/app/api/admin/categories/[id]/fusionner/route.ts POST fusionner
src/app/api/admin/users/[id]/route.ts                PATCH rôle
src/app/api/admin/users/[id]/acces/route.ts          POST prolonger, DELETE révoquer

src/lib/admin-stats.ts        regroupement hebdomadaire (pur)
src/lib/admin-categories.ts   décisions renommage/fusion (pur)
src/lib/admin-acces.ts        clé courante + prolongation (pur)
src/lib/guards.ts             contrôle ADMIN étendu à /api/admin/* (modifié)

tests/admin-stats.test.ts
tests/admin-categories.test.ts
tests/admin-acces.test.ts
tests/guards.test.ts          cas /api/admin/* ajoutés (modifié)
```

Les routes API existantes `/api/admin/keys` et `/api/admin/keys/[id]` ne changent pas.

## Shell admin

- `layout.tsx` : `auth()` → 401/redirect `/connexion` si absent ; lecture du rôle → redirect `/` si non-admin. Rendu d'un en-tête :
  - titre « Miamz Admin » avec la statuette ;
  - lien « Retour à l'app » vers `/plan` ;
  - onglets **Vue d'ensemble**, **Clés**, **Catégories**, **Utilisateurs** sous l'en-tête, sur une seule ligne défilable horizontalement sur 360 px (chaque onglet ≥ 44 px, `aria-current="page"` sur l'actif).
- Contenu centré `max-w-4xl`, padding mobile, pas de barre de navigation d'app.
- Le shell ne réutilise pas `(app)/layout.tsx` (pas de licence requise pour l'admin, pas de compagnon).

## Vue d'ensemble

Six cartes de chiffres, définitions explicites :

| Carte | Valeur | Détail |
|---|---|---|
| Utilisateurs | total | « +N ce mois » (depuis le 1er du mois UTC) |
| Accès actifs | comptes distincts avec une clé ACTIVE non expirée | — |
| Clés disponibles | clés `UNUSED` | « prêtes à être distribuées » |
| Recettes | total | — |
| Repas cette semaine | `MealPlanEntry` de lundi UTC à lundi + 7 | — |
| Courses à cocher | `GroceryListItem` non cochées et non masquées | — |

Sections complémentaires :

1. **Activité des 6 dernières semaines** : inscriptions, recettes créées et clés générées, regroupées par semaine (lundi UTC). Barres CSS proportionnelles, légende à trois couleurs, semaine courante incluse. Les repas planifiés n'apparaissent pas : `MealPlanEntry` n'a pas de date de création, et on n'ajoute pas de migration pour cela.
2. **Catégories les plus utilisées** : top 5 par nombre de recettes, avec barre et compteur ; les autres sont résumées en une ligne. Les catégories vides sont ignorées.
3. **Dernières inscriptions** : 5 comptes les plus récents (nom ou email, date).

États vides : chaque section affiche une phrase courte et neutre (« Aucune activité sur la période », « Aucun compte », etc.).

## Catégories

Page serveur : toutes les catégories (y compris masquées) avec leur nombre de recettes, triées par nom (`localeCompare("fr")`).

Chaque catégorie est une carte avec :

- nom, badge « masquée » le cas échéant, compteur de recettes ;
- boutons **Renommer**, **Masquer** ou **Afficher**, **Fusionner**.

### Renommer

- Modale (`FeuilleModale`) avec champ prérempli, 1 à 60 caractères.
- Le serveur normalise via `normaliserCategorie` et recalcule `cle`.
- Si la clé appartient à une **autre** catégorie → `409 { error, collision: { id, nom } }`. La modale affiche « « Végé » existe déjà » avec un bouton direct **Fusionner avec « Végé »**.
- Si la clé est vide après normalisation → `400`.
- Renommer vers une variante de son propre nom (même clé, même catégorie) est autorisé : seul le libellé change.

### Masquer / afficher

- Bascule `masquee` sans confirmation (réversible), avec état d'attente sur le bouton.
- Une catégorie masquée disparaît des sélecteurs et des chips de filtre, mais les recettes existantes la conservent et continuent d'afficher son nom.
- **« Autre » (`cat-autre`) ne peut pas être masquée** : c'est la catégorie de repli. Le bouton est désactivé avec l'explication.

### Fusionner

- Modale : sélection de la catégorie cible **visible** (`masquee = false`) parmi les autres (hors source), texte explicite « Les N recettes de X passeront dans Y, puis X sera supprimée », bouton **Fusionner**.
- Une cible masquée est exclue du sélecteur et refusée par l'API : fusionner vers une catégorie cachée ferait disparaître les recettes des sélecteurs et des chips de filtre.
- Transaction Prisma : `updateMany` des recettes de la source vers la cible, puis suppression de la source.
- Refus si source = cible, si la cible n'existe pas, si la cible est masquée, ou si la source est `cat-autre`.
- Après succès : fermeture, message « X a été fusionnée dans Y », rafraîchissement.

## Utilisateurs

Page serveur : jusqu'à 200 comptes, plus récents d'abord, avec nom, email, image (ignorée), rôle, date d'inscription, nombre de recettes, et leurs clés (`status`, `expiresAt`, `activatedAt`).

**Clé d'accès courante** : parmi les clés `ACTIVE` d'un compte, une clé illimitée (`expiresAt = null`) prime ; sinon celle dont l'expiration est la plus tardive ; à égalité, la plus récemment activée. C'est elle qui définit la ligne « Accès » et que l'action « Prolonger » modifie. Un compte peut en effet cumuler plusieurs clés `ACTIVE` (ancienne expirée + nouvelle valide).

Chaque utilisateur est une carte avec :

- nom (ou email), email secondaire, badge **Admin** / **Membre** ;
- « Accès : actif jusqu'au … », « expiré depuis … », « illimité », ou « aucune clé » ;
- « Inscrit le … » et nombre de recettes ;
- un champ de recherche au-dessus de la liste (nom ou email, filtrage client instantané, insensible à la casse/accents via `normaliser`).

### Actions

- **Rôle** : modale Membre / Admin. Un admin ne peut pas changer son propre rôle (bouton désactivé, explication). Le serveur refuse aussi (`400`).
- **Prolonger** : disponible si le compte possède une clé `ACTIVE` (même expirée) et que cette clé n'est pas illimitée. Modale avec +7 j, +30 j, +90 j, Illimité. Sans clé `ACTIVE` (aucune clé ou clé révoquée), bouton désactivé avec « Aucune clé active à prolonger ». Si la clé courante est illimitée, bouton désactivé avec « Accès illimité ».
- **Révoquer** : confirmation explicite (« Révoquer tous les accès actifs de X ? ») ; passe **toutes** les clés `ACTIVE` du compte en `REVOKED`, pour couper réellement l'accès même en cas de clés multiples. Action masquée pour soi-même.

Règles de prolongation (fonction pure) :

- `jours = null` → clé illimitée (`expiresAt = null`).
- clé déjà illimitée → reste illimitée (on ne rétrograde jamais).
- clé expirée → nouvelle expiration = maintenant + jours.
- clé encore valide → nouvelle expiration = expiration actuelle + jours.

## Clés

Comportement inchangé (générer 1–100 clés, durée 7/30/90/illimité, révoquer). Seule la présentation change : liste en cartes (code mono, durée, statut coloré, expiration, action) pour rester lisible sur 360 px, et intégration dans le shell admin. Les routes existantes restent la source de vérité.

## Accès depuis l'app

- `(app)/layout.tsx` lit aussi le rôle de l'utilisateur et passe `estAdmin` à `NavBar`.
- Pour un admin uniquement : une icône « Admin » (≥ 44 px) dans l'en-tête desktop et mobile, vers `/admin`. Aucun changement pour les autres comptes.
- L'admin reste exempté de clé (règle existante).

## Contrats API

Toutes les routes vérifient la session **et** le rôle ADMIN ; réponses JSON en français.

| Méthode & route | Corps | Succès | Erreurs |
|---|---|---|---|
| `PATCH /api/admin/categories/[id]` | `{ nom }` ou `{ masquee }` | `200 { categorie }` | 400 nom vide ou > 60 / `cat-autre` masquée ; 404 ; 409 collision avec `collision: { id, nom }` |
| `POST /api/admin/categories/[id]/fusionner` | `{ cibleId }` | `200 { deplacees }` | 400 même catégorie / source `cat-autre` / cible masquée ; 404 source ou cible |
| `PATCH /api/admin/users/[id]` | `{ role: "USER" \| "ADMIN" }` | `200 { user }` | 400 rôle invalide ou soi-même ; 404 |
| `POST /api/admin/users/[id]/acces` | `{ jours: 7 \| 30 \| 90 \| null }` | `200 { cle }` (clé courante prolongée) | 400 valeur invalide ; 404 utilisateur ; 409 aucune clé active ou accès déjà illimité |
| `DELETE /api/admin/users/[id]/acces` | — | `200 { cles }` (nombre de clés révoquées) | 400 soi-même ; 404 ; 409 aucune clé active |

## Logique pure testée

### `src/lib/admin-stats.ts`

`regrouperActiviteParSemaine({ inscriptions, recettes, cles }, nbSemaines, maintenant)` → tableau croissant de semaines `{ debut: "YYYY-MM-DD", inscriptions, recettes, cles }`.

Cas testés : semaine vide incluse ; lundi 00:00 UTC commence une nouvelle semaine ; dimanche 23:59 UTC reste dans la précédente ; dates hors fenêtre ignorées ; semaine courante partielle incluse ; nombre de semaines exact.

### `src/lib/admin-categories.ts`

- `decisionRenommage(nom, id, categories)` → `{ ok: true, cle }` ou `{ ok: false, raison: "vide" | "trop-long" }` / `{ ok: false, raison: "collision", categorie }`.
- `decisionFusion(sourceId, cibleId, categories)` → `{ ok: true }` ou raison `"meme-categorie"`, `"source-autre"`, `"inconnue"`, `"cible-masquee"`.

Cas testés : accents/casse/espaces normalisés ; collision avec une autre catégorie ; variante de son propre nom acceptée ; nom vide ; nom de 61 caractères refusé ; nom de 60 caractères accepté ; fusion vers soi refusée ; fusion de `cat-autre` refusée ; cible inconnue ou masquée refusée ; source masquée acceptée.

### `src/lib/admin-acces.ts`

- `cleDAccesCourante(cles)` → la clé `ACTIVE` qui fait foi (illimitée prioritaire, puis expiration la plus tardive, puis activation la plus récente), ou `null`.
- `prolongerAcces(expiresAt, jours, maintenant)` → `Date | null`.

Cas testés : aucune clé active → `null` ; illimitée prioritaire ; expiration la plus tardive gagnante ; égalité départagée par `activatedAt` ; expirée → prolongation depuis maintenant ; valide → addition à l'expiration ; illimitée → reste illimitée ; `jours = null` → illimitée ; 7/30/90 jours.

## UX, mobile et accessibilité

- Une action en cours : bouton désactivé + libellé d'attente (« Fusion… », « Prolongation… »), jamais de double soumission.
- Succès annoncé via `role="status"` + `aria-live="polite"` ; erreurs inline dans la modale ou la carte concernée.
- Cartes plutôt que tableaux : aucun défilement horizontal de page à 360 px.
- Grille de stats : 2 colonnes sur mobile, 3 sur desktop, chiffres `text-2xl`, libellés courts.
- Barres d'activité : 6 colonnes, couleurs de la palette (menthe, lilas, corail), légende textuelle ; pas de couleur seule pour porter une information.
- Modales via `FeuilleModale` (focus piégé et restauré, fermeture ✕/fond/Échap déjà en place).
- Recherche utilisateurs : `label` visible ou `aria-label`, champ ≥ 44 px.
- `prefers-reduced-motion` respecté (aucune animation indispensable).

## Sécurité et garde-fous

- Contrôle ADMIN dans le layout, dans chaque route API, et dans `routeGuard` pour `/api/admin/*`.
- Auto-protection : impossible de changer son propre rôle ou de révoquer son propre accès via ces routes.
- Fusion destructive : confirmation explicite, transaction unique, compteur de recettes déplacées renvoyé.
- `cat-autre` protégée (ni masquée, ni fusionnée comme source).
- Entrées validées (nom 1–60 après trim, rôle énuméré, jours énumérés, ids non vides).
- Aucune donnée personnelle supplémentaire collectée.

## Tests et vérification

- Nouveaux tests purs : environ 31 cas sur les trois modules, plus 3 cas de garde.
- Cas de garde ajoutés dans `tests/guards.test.ts` : un membre licencié est refusé sur `/api/admin/*`, un admin passe.
- Suite complète (`npm test`) et build (`npm run build`) verts avant chaque commit.
- Vérification manuelle sur 360 px : onglets, modales, fusion, prolongation, révocation, recherche.
- Aucun test de route (convention).

## Décisions issues de la relecture

- **Plusieurs clés actives par compte** : une seule fait foi. La clé illimitée prime ; sinon l'expiration la plus tardive ; à égalité, l'activation la plus récente. « Prolonger » ne touche qu'à cette clé. Raison : prolonger une ancienne clé déjà expirée pendant qu'une autre clé garde l'accès n'aurait aucun effet visible.
- **« Révoquer » coupe réellement l'accès** : toutes les clés `ACTIVE` du compte passent en `REVOKED`, et la réponse indique le nombre de clés révoquées. Raison : révoquer une seule clé laisserait le compte actif, ce qui donnerait l'impression d'un bouton cassé.
- **Garde `/api/admin/*` corrigée** : `routeGuard` traite désormais le préfixe `/api/admin` comme `/admin`, avec un test. Raison : les contrôles par route suffisaient à la sécurité, mais la défense en profondeur annoncée n'était pas réelle.
- **Cible de fusion visible uniquement** : le sélecteur et l'API refusent une cible masquée. Raison : fusionner vers une catégorie cachée retirerait les recettes des sélecteurs et des filtres, exactement ce que l'admin cherche à éviter.

## Risques et dette acceptée

- **Fusion irréversible** : la catégorie source est supprimée ; seules les recettes sont conservées. La confirmation affiche le nombre exact.
- **Révocation multiple** : l'action révoque toutes les clés actives d'un compte ; la confirmation le dit explicitement.
- **Stats partielles** : pas d'historique des repas planifiés ni des visites ; l'activité repose sur les dates de création disponibles. Assumé et affiché tel quel.
- **Liste utilisateurs plafonnée à 200**, sans pagination. À revoir si le cercle s'agrandit.
- **Pas de clé active = pas de prolongation** : il faut générer une nouvelle clé et la transmettre. Documenté dans l'UI.
- Catégories masquées encore référencées par des recettes : comportement voulu ; il n'existe pas encore d'écran d'édition de recette qui pourrait gêner.
- Le lien admin n'apparaît qu'après rechargement du layout si le rôle change (pas de temps réel).

## Ce qui reste à trancher par l'implémenteur

- Découpage exact des composants de carte (factorisation éventuelle entre clés/catégories/utilisateurs).
- Forme des barres CSS (hauteur fixe, échelle relative au maximum de la période).
- Ordre des cartes de stats sur mobile (l'ordre du tableau fait foi par défaut).
- Libellés courts des semaines (« 13/10 » plutôt que « semaine du 13 octobre ») selon la place disponible.

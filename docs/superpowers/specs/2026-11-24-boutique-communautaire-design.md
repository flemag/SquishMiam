# Boutique communautaire + Jetons + Validation — Design

Date : 2026-11-24  
Statut : proposé (à valider par Steve)  
Prérequis : panneau admin (terminé), planning mobile (terminé), tags filtrés (terminé)

---

## Intention et pourquoi

Aujourd'hui les recettes sont privées. Steve veut une **boutique communautaire** où :
- Chacun peut **publier** ses recettes (opt-in, pas par défaut)
- La communauté **valide** (3 validations = badge « Validée par la communauté »)
- Les validateurs gagnent des **jetons** (réputation + monnaie future)
- Une recette validée devient **accessible en lecture seule** (bouton « Ajouter à mes recettes »)
- Les jetons servent à la fois de **réputation** (badges, classement) et de **monnaie future** (thèmes, recettes premium, etc.)

---

## Objectifs

1. **Publication** : bouton « Publier sur la boutique » sur chaque recette (opt-in, réversible)
2. **Marketplace** : page `/boutique` listant les recettes validées (badge visible)
3. **Validation** : 3 validations distinctes (pas l'auteur) → badge « Validée par la communauté »
4. **Jetons** :
   - 1 jeton par validation (plafond 10 jetons / utilisateur)
   - Pas d'auto-validation
   - Jetons = réputation (badge validateur, futur classement) + monnaie future (thèmes, recettes premium)
5. **Accès partagé** : sur recette validée → bouton « Ajouter à mes recettes » → copie en lecture seule dans le compte
6. **Signalement** : bouton « Signaler » sur recette publiée (spam, inapproprié, etc.)

---

## Non-objectifs

- Système de commentaires / notes / avis (plus tard)
- Achat direct de recettes entre utilisateurs (plus tard)
- Marketplace thèmes / goodies (plus tard, quand jetons = monnaie)
- Modération admin complète (juste signalement pour v1)
- Notifications push / email (plus tard)

---

## Contraintes héritées

- Next.js 15 / React 19 / TypeScript / Prisma / Tailwind v4, zéro nouvelle dépendance
- Mobile 360 px : cibles ≥ 44 px, aucun débordement horizontal
- Animations `transform`/`opacity` + `prefers-reduced-motion`
- UI française, ton tutoiement, Fredoka
- TDD sur logique pure (Vitest), `npm test` + `npm run build` verts avant commit
- Migration additive seulement

---

## Modèle de données

```prisma
model Recipe {
  // ... existant
  isPublic          Boolean   @default(false)     // publiée sur la boutique
  publishedAt       DateTime?                     // date de publication
  validatedAt       DateTime?                     // date du badge (3ème validation)
  validationCount   Int       @default(0)         // nombre de validations
  validators        User[]    @relation("RecipeValidators") // users ayant validé
  sharedWith        User[]    @relation("RecipeShares")     // users ayant ajouté à leurs recettes
  reports           Report[]                       // signalements
}

model User {
  // ... existant
  tokens            Int       @default(0)         // jetons gagnés (max 10)
  validatedRecipes  Recipe[]  @relation("RecipeValidators")
  sharedRecipes     Recipe[]  @relation("RecipeShares")
  // future: TokenTransaction[] pour historique
}

model Report {
  id          String   @id @default(cuid())
  recipeId    String
  recipe      Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)
  reporterId  String
  reporter    User     @relation(fields: [reporterId], references: [id], onDelete: Cascade)
  reason      String   // "spam" | "inapproprié" | "autre"
  detail      String?
  createdAt   DateTime @default(now())
  status      ReportStatus @default(PENDING) // PENDING | REVIEWED | DISMISSED
}

enum ReportStatus {
  PENDING
  REVIEWED
  DISMISSED
}
```

Migration additive : nouveaux champs + tables, pas de suppression.

---

## API

### `POST /api/recipes/[id]/publish`
- Body : `{ publish: boolean }`
- Si `true` : `isPublic=true`, `publishedAt=now`, `validationCount=0`, `validators=[]`
- Si `false` : `isPublic=false`, `publishedAt=null`, `validatedAt=null`, `validationCount=0`, `validators=[]`, supprime les partages
- 403 si pas l'auteur

### `POST /api/recipes/[id]/validate`
- Vérifications : recette publique, pas l'auteur, pas déjà validé
- Ajoute user aux `validators`, incrémente `validationCount`
- Si `validationCount === 3` : `validatedAt=now`, badge attribué
- Donne 1 jeton au validateur (si `tokens < 10`)
- 409 si déjà validé, 403 si auteur, 404 si pas publique

### `POST /api/recipes/[id]/share`
- Recette doit être validée (`validatedAt != null`)
- Ajoute user aux `sharedWith` (copie lecture seule)
- 409 si déjà partagé, 404 si pas validée

### `POST /api/recipes/[id]/report`
- Body : `{ reason: "spam" | "inapproprié" | "autre", detail?: string }`
- 403 si auteur, 404 si pas publique
- Crée `Report` avec `status=PENDING`

### `GET /api/boutique`
- Query : `categorieId?`, `search?`, `page?`, `limit?`
- Retourne recettes validées (`validatedAt != null`) + infos auteur (nom, avatar)
- Tri : plus validées d'abord, puis récentes

---

## Pages & Composants

### 1. Page Recette (existant) — ajouts
- Si auteur & pas publique : bouton « Publier sur la boutique » (ouvre modale confirmation)
- Si auteur & publique : badge « Publiée », bouton « Retirer de la boutique »
- Si publique & pas validée : compteur « X/3 validations »
- Si validée : badge « ✅ Validée par la communauté », bouton « Ajouter à mes recettes » (pour les autres)
- Si pas auteur & validée : bouton « Ajouter à mes recettes » → copie lecture seule
- Bouton « Signaler » (ouvre modale raison + détail)

### 2. Page `/boutique` (nouvelle)
- Header : titre « Boutique communautaire », recherche, filtre catégorie
- Grille cartes recettes (même style que `/recettes`)
- Chaque carte : image/titre, auteur, badge « Validée », tags, bouton « Voir » + « Ajouter »
- Pagination / infinite scroll

### 3. Modales
- **Publier** : « Publier cette recette sur la boutique ? Elle sera visible par tous et pourra être validée. » → Publier / Annuler
- **Retirer** : « Retirer de la boutique ? Elle ne sera plus visible ni validable. » → Retirer / Annuler
- **Valider** : « Valider cette recette ? Tu gagnes 1 jeton (max 10). » → Valider / Annuler
- **Partager** : « Ajouter cette recette à ta cuisine ? Tu pourras la planifier mais pas la modifier. » → Ajouter / Annuler
- **Signaler** : select raison (spam/inapproprié/autre) + textarea détail → Envoyer / Annuler

### 4. Page Profil (existant) — ajouts
- Affichage jetons : `🪙 X/10`
- Badge « Validateur » si `tokens > 0`
- Onglet « Mes partages » : recettes ajoutées via boutique (lecture seule)

---

## Règles métier

| Règle | Détail |
|-------|--------|
| Publication | Opt-in, réversible à tout moment par l'auteur |
| Validation | 3 users distincts ≠ auteur |
| Jetons validation | +1 jeton si `tokens < 10`, sinon 0 (mais validation comptée) |
| Auto-validation | Interdite (403) |
| Partage | Copie lecture seule : `Recipe` dupliquée avec `isSharedCopy=true`, `sourceRecipeId`, `editable=false` |
| Modification partagée | Impossible (UI + API bloquent) |
| Suppression source | Si auteur supprime sa recette validée → partages conservés mais `sourceRecipeId` nullifié |
| Signalement | Visible dans panneau admin (future) |

---

## Accessibilité & UX

- Toutes modales via `FeuilleModale` (focus trap, Échap, fond)
- Boutons ≥ 44 px, `min-h-11`
- États d'attente : libellé « Validation… », « Publication… »
- `prefers-reduced-motion` respecté
- Tooltips sur badges (explication jetons, validation)

---

## Admin (panneau existant)

Nouvel onglet « Signalements » : liste reports `PENDING`, actions « Fermer » / « Supprimer recette ».

---

## Tests attendus

- Logique pure : calcul jetons, éligibilité validation, seuil badge
- API : 403 auto-validation, 409 double validation, 404 non publique
- UI : modales accessibles, états d'attente, badges affichés

---

## Ce qui reste au builder

- Extraction exacte des modales (factorisation `FeuilleModale`)
- Page `/boutique` avec grille responsive + pagination
- Copie lecture seule : `isSharedCopy`, `sourceRecipeId`, `editable` + guards API/UI
- Signalement : composant modale + intégration panneau admin

---

## Prochaine étape après validation

Écrire le plan d'implémentation (tasks TDD) → implémentation native.
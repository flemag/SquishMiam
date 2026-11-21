# Sélecteur de recettes + catégories — design

Date : 2026-11-20
Statut : proposé (en attente d'approbation de Steve)

## Intention et pourquoi

Aujourd'hui, quand Steve remplit une case du planning, la feuille d'ajout affiche **toutes** les recettes avec un simple champ texte. Plus le carnet grossit, plus choisir devient pénible. On veut retrouver « une recette de poisson » en deux gestes, sans taper au clavier.

Les catégories créées ici deviendront aussi le vocabulaire de la boutique (étape 4) : chercher une recette de poisson dans le carnet ou dans la boutique doit se ressembler.

## Objectifs

- Depuis la feuille d'ajout de repas : filtrer par **catégorie**, **durée** et **texte**, en combinant les trois.
- Créer une catégorie **sans friction** depuis le formulaire de recette (création libre, validée par Steve).
- Les catégories vivent **en base**, pas dans le code : pré-remplies avec 9 catégories de départ, renommables/masquables/fusionnables plus tard depuis le panneau admin (étape 3).
- Les recettes existantes atterrissent dans « Autre » : aucune recette n'est perdue ni bloquée.

## Non-objectifs

- Pas de gestion admin des catégories (renommer, masquer, fusionner) dans ce chantier — étape 3.
- Pas de boutique, pas de jetons, pas de validation communautaire.
- Pas de photos, pas de catégorisation automatique par IA.
- Pas de sous-catégories.

## Contraintes

- Zéro nouvelle dépendance npm.
- Migration strictement additive sur une base de production déjà peuplée.
- Mobile 360 px : pas de débordement horizontal de page (seule la rangée de chips défile), cibles ≥ 44 px, français, `prefers-reduced-motion` intact.
- TDD sur la logique pure (normalisation, filtre), suite `npm test` + `npm run build` vertes avant chaque commit.

## Approches considérées

1. **Liste figée dans le code** (`CATEGORIES` exportée) : la plus rapide, mais contredit la demande « modifiable et création libre par les utilisateurs ». Rejetée.
2. **Catégories en base, création libre, pas de modération** *(retenue)* : table `Categorie`, création à la volée, dédoublonnage insensible à la casse/accents. Risque de doublons (« Végé » / « Végétarien »), nettoyés plus tard par l'admin. Aucune friction pour l'utilisateur.
3. **Catégories proposées puis validées par l'admin** : vocabulaire propre, mais friction immédiate et Steve devient le goulot. Rejetée.

## Décisions (validées par Steve)

- Liste de départ : Pâtes, riz & céréales · Végé · Viande · Poisson · Soupe · Salade · Œufs & brunch · Dessert · Autre.
- **Création libre** par tout utilisateur connecté ; l'admin garde le ménage (renommer/masquer/fusionner) pour l'étape 3.
- Une recette sans catégorie explicite va dans **Autre** par défaut.

## Le modèle

```prisma
model Categorie {
  id        String   @id                  // ids stables pour le seed, cuid pour les créations
  nom       String
  cle       String   @unique              // nom normalisé : minuscules, sans accents, espaces compactés
  masquee   Boolean  @default(false)
  createdAt DateTime @default(now())
  recettes  Recipe[]
}

model Recipe {
  // ...existant
  categorieId String?
  categorie   Categorie? @relation(fields: [categorieId], references: [id], onDelete: SetNull)
}
```

- La migration seed les 9 catégories avec des **ids stables** (`cat-pates`, `cat-vege`, … `cat-autre`) puis affecte `categorieId = 'cat-autre'` à toutes les recettes existantes.
- `cle` est calculée côté application par une fonction pure `normaliserCategorie(nom)` : `normaliser()` existante (accents, œ/æ) + `trim()` + espaces multiples compactés. Elle garantit l'unicité insensible à la casse.
- Masquer une catégorie ne touche pas ses recettes ; elle disparaît des filtres et de la création.

## Le filtre (logique pure, testée)

`filtrerRecettes` gagne un critère optionnel `categorieId: string | null` (ET avec `requete`, `tags`, `dureeMax`). `RecetteRecherchable` gagne `categorieId: string | null`.

Nouveaux tests :
- `normaliserCategorie` : accents, casse, espaces, œ/æ, chaîne vide → refus.
- `filtrerRecettes` : catégorie seule, catégorie + durée, catégorie + texte, `null` = toutes.

## L'API

- **Aucun endpoint de lecture** : les pages serveur lisent les catégories visibles (`masquee: false`, tri `nom` en français) et les passent en props.
- `POST /api/categories` — body `{ nom }`. Auth requise. Validation manuelle (style des routes courses) : nom non vide après trim, ≤ 40 caractères. Si `cle` existe déjà → `200 { categorie }` (existante, même masquée : on la révèle ? **non** — on la renvoie telle quelle, le client l'utilise) ; sinon `201 { categorie }`. `P2002` → relire et renvoyer `200` (défense en profondeur).
- `POST /api/recipes` accepte `categorieId?: string` : si fourni, la catégorie doit exister et être visible, sinon `400 { error: "Catégorie inconnue" }`. Absent → `cat-autre`.
- `PATCH /api/recipes/[id]` accepte `categorieId` ; **aucune sync de courses** (seuls ingrédients/portions la déclenchent, règle existante).

## Les écrans

### Feuille d'ajout de repas (`src/components/plan/feuille-repas.tsx`)

Sous le champ de recherche, dans cet ordre :
1. **Rangée de catégories** défilante horizontalement, chips ≥ 44 px : « Toutes » + les catégories visibles. Une seule active à la fois.
2. **Rangée de durées** : Toutes · ≤ 20 min · ≤ 30 min · ≤ 45 min (même style, une seule active).
3. Le compteur existant devient « N recette(s) ».
4. Si le résultat est vide : « Aucune recette ne correspond. » + bouton « Réinitialiser les filtres ».

La liste des recettes se met à jour à chaque chip (état local, aucune requête). Le tap sur une recette et le comportement d'ajout/modification restent inchangés.

### Formulaire de recette (`src/app/(app)/recettes/nouvelle/page.tsx`)

- Champ « Catégorie » : `<select>` des catégories visibles, présélectionné sur « Autre ».
- Option « ＋ Nouvelle catégorie… » → petit champ texte + bouton « Créer » (état d'attente « Création… ») ; succès → la nouvelle catégorie est sélectionnée, sans rechargement de page ; `409`/erreur affichée en français.
- La catégorie est envoyée via `categorieId`.

### Page Recettes (`src/components/recettes/recettes-client.tsx`)

- Même rangée de chips catégorie, en plus des tags, durées et tri existants.
- Les fiches recette affichent la catégorie dans leur méta (petit texte).

## Critères de réussite

1. Depuis `/plan`, taper une case vide → la feuille s'ouvre → un tap sur « Poisson » ne montre que les recettes de poisson.
2. Créer une recette avec une catégorie inédite (« Tajines ») depuis le formulaire, puis la retrouver immédiatement dans le filtre du planning.
3. Une recette existante apparaît dans « Autre » après migration.
4. Aucun débordement horizontal à 360 px ; chips et boutons ≥ 44 px.
5. `npm test` et `npm run build` verts.

## Laissé au plan d'implémentation

- Découpage exact des tâches et ordre (migration → lib pure + tests → API → formulaire → feuille → page Recettes).
- Copie exacte des libellés secondaires et détails d'espacement.

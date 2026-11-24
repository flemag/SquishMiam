# Photo frigo — design

Date : 2026-11-24
Statut : proposé (en attente d'approbation)

## Intention

L'utilisateur importe une photo de son frigo. L'IA vision identifie les
ingrédients visibles. L'app propose alors :
1. Les recettes existantes de l'utilisateur qui matchent (par ingrédients).
2. Un brouillon de nouvelle recette basé sur les ingrédients détectés.

Résultat affiché sur la page Recettes.

## Objectifs

- Import d'une photo depuis la galerie (input file).
- Compression côté client (max ~800 px, JPEG 0,7) pour limiter les tokens.
- Essai automatique de plusieurs modèles vision gratuits (OpenRouter).
- Extraction d'une liste d'ingrédients depuis la réponse IA.
- Matching flou entre ingrédients détectés et ingrédients des recettes.
- Affichage : ingrédients détectés + recettes qui matchent + brouillon optionnel.
- Mobile 360 px, cibles ≥ 44 px, zéro nouvelle dépendance.

## Non-objectifs

- Pas de caméra en direct (import galerie uniquement).
- Pas de sauvegarde automatique de la photo.
- Pas de détection de quantités (juste les noms).
- Pas de mode hors-ligne.

## Design

### Logique pure — `src/lib/photo-frigo.ts` (TDD)

- `normaliserIngredient(nom: string): string` — minuscules, sans accents, sans articles.
- `extraireIngredients(contenu: string): string[]` — parse la réponse IA (JSON ou liste).
- `matcherRecettes(ingredients: string[], recettes: { id, title, ingredients: {nom}[] }[]): { id, title, score, ingredientsMatches }[]` — score = nb ingrédients matchés / total ingrédients de la recette.
- `parserPhotoFrigo(contenu: string): { ingredients: string[]; brouillon?: RecetteExtraite } | null`

### Modèles vision — `src/lib/openrouter.ts`

- Ajouter `MODELES_VISION` : liste de modèles gratuits avec capacité vision.
- `demanderReponseVision(messages, imageBase64, options)` : envoie le message avec l'image en base64 (format OpenAI image_url), essaie les modèles dans l'ordre.

### API — `POST /api/recipes/photo-frigo`

- Corps `{ image: string }` (data URL base64).
- 401 non authentifié, 400 image manquante/trop grande (> 2 Mo).
- Charge les recettes de l'utilisateur.
- Appelle `demanderReponseVision` avec prompt : « Identifie les ingrédients visibles dans ce frigo. Réponds en JSON : { "ingredients": [...], "brouillon": { ... } } ».
- Parse la réponse, matche les recettes, renvoie `{ ingredients, recettesMatchees, brouillon }`.

### UI — `src/components/recettes/photo-frigo.tsx`

- Bouton « 📸 Photo de frigo » sur la page recettes (à côté de « + Nouvelle recette »).
- Input file caché (accept="image/*").
- Preview de la photo + bouton « Analyser ».
- Pendant l'analyse : « Miamz observe ton frigo… ».
- Résultats dans une feuille Miamz :
  - Ingrédients détectés (chips).
  - Recettes qui matchent (cartes cliquables → ouvre la fiche).
  - Brouillon proposé (bouton « Utiliser ce brouillon » → préremplit le formulaire).
- Erreur : message doux + « Réessayer ».

### Coût / garde-fous

Un appel vision par clic, 15 s max, ~1200 tokens. Image compressée côté client.

## Ce qui reste au bâtisseur

Libellés exacts, seuil de matching (ex. ≥ 50 % des ingrédients), nombre max de recettes proposées, ton des messages.

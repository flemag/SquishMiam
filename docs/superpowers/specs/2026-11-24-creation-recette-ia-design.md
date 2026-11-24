# Création de recette assistée par IA — design

Date : 2026-11-24
Statut : proposé (en attente d'approbation)
Approche retenue : **A — Idée → brouillon**

## Intention

Dans `/recettes/nouvelle`, Steve veut pouvoir décrire une idée en quelques mots
et recevoir un **brouillon complet** (titre, portions, durée, tags, ingrédients,
étapes), qu'il ajuste avant d'enregistrer. Des astuces doivent rendre l'IA
évidente et utile, sans transformer le formulaire en chat.

## Objectifs

- Un encart « Une idée ? Miamz te prépare un brouillon » au-dessus de l'import URL.
- Champ idée (300 caractères max), 3 exemples cliquables, bouton « Proposer une recette ».
- L'IA remplit tous les champs du formulaire ; la catégorie reste manuelle.
- L'IA tient compte du foyer et de l'objectif du profil.
- Aucun enregistrement automatique : Steve relit et ajuste.
- Repli clair si l'IA échoue : message + invitation à réessayer ou remplir à la main.
- Mobile 360 px, cibles ≥ 44 px, zéro nouvelle dépendance.

## Non-objectifs

- Pas de génération d'image, pas de chat multi-tours, pas de sauvegarde auto.
- Pas de création de catégorie par l'IA.
- Pas de régénération partielle champ par champ (approche B, plus tard).

## Anti-objectifs

- Une recette générique qui ignore l'idée décrite.
- Des quantités absurdes ou des étapes vagues.
- Un écran qui écrase silencieusement ce que Steve avait déjà saisi.

## Design

### Logique pure — `src/lib/creation-recette.ts` (TDD)

- `parserRecetteGeneree(contenu: string): RecetteExtraite | null`
  - retire les fences ```json, `JSON.parse`, exige `title` non vide et
    `ingredients` non vide ;
  - `servings` borné 1–12 via `parseServings`, `minutes` entier positif,
    tags/étapes nettoyés, ingrédients filtrés (nom requis) ;
  - toute forme inexploitable → `null`.
- `ideeValide(idee: string): boolean` : trim non vide, ≤ 300 caractères.

### API — `POST /api/recipes/assistant`

- Corps `{ idee: string }`. 401 non authentifié, 400 idée vide/trop longue.
- Charge `householdSize` et `goal`, construit le prompt avec `phraseProfil`.
- `demanderReponseIa` : `maxTokens: 900`, `temperature: 0.7`, `timeoutMs: 9000`.
- Réponse `{ recette: RecetteExtraite }` ; 422 si le parseur renvoie `null`.
- Un seul appel par clic, aucun retry, aucun cache.

### UI — `src/components/recettes/assistant-recette.tsx`

- Encart crème/menthe au-dessus de l'import URL, dans `formulaire-recette.tsx`.
- Textarea + 3 puces d'exemple (« Gratin rapide pour 2 », « Dîner végétarien
  de saison », « Plat familial pas cher »).
- Bouton désactivé + « Miamz rédige… » pendant l'appel.
- Succès : « Brouillon prêt — ajuste puis enregistre. » et remplissage des
  champs existants (titre, portions, minutes, tags, ingrédients, étapes).
- Erreur : message doux, bouton « Réessayer ».
- Astuces statiques : décrire le plat, le temps, le régime ; rappel que le
  foyer et l'objectif sont pris en compte.

### Coût / garde-fous

Un appel par clic, 9 s max, ~900 tokens. Aucun coût au chargement.

## Ce qui reste au bâtisseur

Libellés exacts des astuces, place des puces d'exemple, seuil de troncature
du champ idée, ton des messages d'erreur.

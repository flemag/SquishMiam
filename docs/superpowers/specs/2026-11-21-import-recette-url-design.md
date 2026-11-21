# Import de recettes par URL — design

Date : 2026-11-21
Statut : validé par Steve (2026-11-21)

## Intention et pourquoi

Aujourd'hui, pour ajouter une recette à Miamz, Steve doit saisir manuellement chaque champ : titre, portions, durée, chaque ingrédient avec quantité et unité, et chaque étape. Sur mobile, cela prend 3 à 5 minutes par recette.

L'**import par URL** permet de coller l'adresse d'une page de cuisine (Marmiton, 750g, CuisineAZ, blogs) et de pré-remplir le formulaire en un clic. Steve relit, ajuste si besoin, et enregistre en 10 secondes.

---

## Objectifs

1. **Bouton / volet d'import dans le formulaire** : sur `/recettes/nouvelle`, un volet discret « Importer depuis un lien » avec champ URL et bouton « Importer ».
2. **Extraction hybride 2 niveaux** :
   - **Niveau 1 — Instantané et zéro token (JSON-LD `schema.org/Recipe`)** : extraction pure côté serveur des données structurées présentes dans le HTML (utilisées par 90%+ des sites culinaires).
   - **Niveau 2 — Fallback IA OpenRouter** : si la page ne contient pas de JSON-LD valide, appel au modèle gratuit OpenRouter avec le texte épuré de la page pour extraire le JSON de la recette.
3. **Pré-remplissage du formulaire** : les données extraites (`title`, `servings`, `minutes`, `tags`, `ingredients`, `steps`) viennent remplir les états locaux du formulaire existant.
4. **Validation humaine obligatoire** : rien n'est persisté directement en base ; l'utilisateur garde le contrôle total avant d'appuyer sur « Enregistrer la recette ».

---

## Non-objectifs

- Pas d'enregistrement automatique sans passage par le formulaire.
- Pas de scraping d'images dans cette étape (les recettes restent en pur texte).
- Pas d'import de fichiers PDF ou scan de livres de recettes (prévu plus tard).
- Pas de contournement des paywalls ou sites bloquant les robots.

---

## Sécurité et Robustesse (SSRF & Timeouts)

- **Protection SSRF** : validation stricte de l'URL (`http:` ou `https:`, rejet formel des adresses locales/privées `localhost`, `127.0.0.1`, `10.*`, `192.168.*`, `172.16.*..172.31.*`, `::1`).
- **Timeout réseau** : 8 secondes maximum sur le fetch de la page distante.
- **Limite de taille** : lecture tronquée à 2 Mo de HTML maximum pour éviter les saturations mémoire.
- **User-Agent standard** : envoi d'un User-Agent de navigateur moderne pour éviter les 403 sur les sites publics.

---

## Découpage des formats extraits

### 1. Ingrédients
Une chaîne brute comme `"250 g de farine de blé"` ou `"2 cuillères à soupe d'huile d'olive"` ou `"3 oeufs"` est découpée par un parseur pur regex en :
- `nom` : `"farine de blé"` / `"huile d'olive"` / `"oeufs"`
- `quantite` : `250` / `2` / `3`
- `unite` : `"g"` / `"cuillère à soupe"` (ou normalisée selon la liste existante `g, kg, ml, cl, l, pièce, boîte` ou libre)

### 2. Durée
Support des formats ISO 8601 type `PT30M`, `PT1H15M` ainsi que des mentions courantes en minutes.

### 3. Portions
Nettoyage des chaînes type `"4 personnes"`, `"pour 6"` → `4`, `6` (borné entre 1 et 12, défaut 2).

---

## Interfaces techniques

### Endpoint `POST /api/recipes/import-url`
- **Auth requise** : session active avec licence valide.
- **Entrée** : `{ url: string }`
- **Sortie succès `200`** :
  ```ts
  {
    recette: {
      title: string;
      servings: number;
      minutes?: number;
      tags: string[];
      ingredients: { nom: string; quantite?: number; unite?: string }[];
      steps: string[];
    }
  }
  ```
- **Sorties erreur** :
  - `400` : URL invalide ou interdite (SSRF).
  - `422` : Impossible de trouver une recette sur cette page.
  - `504` : La page distante n'a pas répondu à temps.

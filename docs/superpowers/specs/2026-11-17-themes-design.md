# Design — Plan 2d « Miamz en couleurs » (thèmes, fond animé, mascotte présente)

Date : 2026-11-17 · Statut : approuvé par Steve (maquettes du jour, thème B retenu + 3 thèmes au choix) · Base : `2026-11-16-miamz-design.md`

## Intent et pourquoi

En utilisant l'app, Steve trouve le thème « triste » : fond beige trop sobre, boutons simples. Il veut une direction visuelle **nourriture / mangaka kawaii** : plus de vie, des animations, **un fond animé**, et **Miamz plus présent**. Décisions prises sur maquettes (compagnon visuel) : le thème **« Manga food truck »** (damier pastel qui défile, traits chocolat, ombres décalées, boutons bonbon) devient **le thème par défaut**, et l'app propose **3 thèmes au choix** (A « Nappe & confiture » doux, B « Manga food truck » affirmé, C « Pique-nique gingham » chaleureux). La **future boutique** ajoutera des thèmes gratuits et payants — l'architecture doit le permettre sans le construire.

## Objectifs

1. **Système de thèmes** : un thème = un jeu de variables CSS (palette + géométrie) posé sur `<html data-theme="…">` ; tout l'habillage passe par un petit jeu de **classes sémantiques** (`.carte`, `.bouton`, `.bouton-secondaire`, `.bouton-danger`, `.puce`, `.champ`).
2. **3 thèmes au lancement** : `manga` (défaut), `doux`, `pique-nique` — changeables en un tap, **instantanément, sans rechargement**.
3. **Fond animé par thème** : composant unique `FondAnime` (damier défilant + doodles pour manga ; dégradé + doodles discrets pour doux ; vichy + doodles pour pique-nique).
4. **Mascotte plus présente** : le compagnon Miamz (avec bulle contextuelle) sur **chaque page** de l'app, et **réaction au tap** (saut + message fun).
5. **Sélecteur de thème** dans la barre du haut (pastilles avec aperçu), mémorisé.

## Non-objectifs / anti-objectifs

- Pas de stockage du thème en base (cookie suffit ; la boutique mécanisera l'entitlement).
- Pas de mode sombre, pas de thème personnalisable par l'utilisateur (créateur de thème).
- Pas de marketplace de thèmes — seulement la **préparation** (extension future).
- Pas de nouvelle dépendance npm ; pas de bibliothèque d'animation.

## Contraintes (héritées)

- Animations `transform`/`opacity` uniquement ; `prefers-reduced-motion` → tout s'arrête (fond compris), l'information reste.
- Mobile + desktop : 360 px, cibles ≥ 44 px, aucun débordement (le fond est fixe, derrière le contenu).
- UI 100 % française ; Fredoka ; zéro dépendance npm nouvelle.
- TDD sur la logique pure (choix de thème, bulles) ; `npm test` + `npm run build` verts à chaque commit.

## Approches considérées (et retenues)

- **Thématisation** : (a) `data-theme` + variables CSS + classes sémantiques — **retenu** (changement instantané, un seul jeu de classes, extensible à N thèmes) ; (b) un fichier CSS par thème chargé dynamiquement — rejeté (flash de chargement, requêtes en plus) ; (c) préfixes de classes par thème dans Tailwind — rejeté (duplication de chaque composant).
- **Persistance du choix** : (a) cookie lu côté serveur dans le layout racine — **retenu** (zéro flash au premier rendu, aucune BDD) ; (b) localStorage + script inline anti-flash — rejeté (script inline à maintenir pour le même résultat).
- **Fond animé** : (a) composant serveur unique + keyframes CSS (transform/opacity) — **retenu** ; (b) canvas/particules — rejeté (coût CPU mobile, complexité).

## Décisions de conception

1. **Tokens** (sur `:root` = `manga`, surris par `html[data-theme="doux"]` / `["pique-nique"]`) :
   - Palette existante conservée comme contrat (`--miamz-rose`, `--miamz-menthe`, `--miamz-creme`, `--miamz-lilas`, `--miamz-vert`, `--miamz-corail`) — **les valeurs changent par thème** (ex. `--miamz-creme` = base du fond : `#FFF3D6` en manga, `#FFF9E6` en doux, `#FFF7EA` en pique-nique).
   - Nouveaux tokens de géométrie : `--trait` (couleur du trait, `#3A2E2E` en manga, translucide sinon), `--epaisseur-trait` (2.5 px / 1.5 px / 1.5 px), `--ombre-carte` (décalée pleine en manga, douce floue ailleurs), `--ombre-bouton`, `--rayon-carte` (16/20/18 px), `--rayon-bouton` (14/999/16 px).
2. **Classes sémantiques** dans `globals.css` (`@layer components`) : `.carte`, `.bouton`, `.bouton-secondaire`, `.bouton-danger` (min-h 44 px), `.puce`, `.champ`. Le refactor des composants existants (nav-bar, cartes, grilles, pages, connexion) remplace les hex bruts par ces classes — c'est ce qui rend les 3 thèmes possibles partout d'un coup.
3. **FondAnime** : composant serveur (statique + keyframes), `position: fixed; inset: 0; z-index: -1` — banque de doodles SVG inline (onigiri, œuf, fraise, tomate, carotte, étoile) réutilisée par les trois thèmes (opacité/densité propres à chaque thème ; damier défilant uniquement en manga). Derrière le contenu, jamais cliquable.
4. **Mascotte** : `CompagnonMiamz` passe sur toutes les pages (déjà dans le layout `(app)`) avec **bulle contextuelle par page** (mapping chemin → pool de messages, utilitaire pur testé : plan/recettes/courses, défaut générique) ; **tap sur Miamz** → réaction locale (keyframe de saut existant + message fun aléatoire du pool, sans événement moteur d'humeur).
5. **Sélecteur** : bouton palette (SVG inline) dans la barre du haut → popover listant les 3 thèmes (pastille-aperçu + nom, cible ≥ 44 px) ; au choix : pose du cookie `miamz-theme` (`path=/; max-age=31536000; samesite=lax`) **et** `document.documentElement.dataset.theme` (effet immédiat). Le layout racine lit `cookies()` et rend `<html data-theme="…">`.
6. **Boutique (amendement au design doc maître)** : les thèmes deviennent un type de contenu boutique (gratuits/payants) ; au moment venu, le choix passera côté compte avec vérification d'entitlement ; le cookie reste la valeur de rendu par défaut.

## Ce qui reste au builder

- Réglages fins des valeurs par thème (opacité/densité des doodles, vitesse du damier) — retouche visuelle avec Steve.
- L'ordre exact des doodles et leurs positions.
- Le découpage en tâches et tests du plan d'implémentation.

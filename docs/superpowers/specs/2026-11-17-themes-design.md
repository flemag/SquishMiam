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

## Palettes exactes (extraites des maquettes validées — `.superpowers/brainstorm/643-1794925693/content/ambiance.html`)

La palette contractuelle (`--miamz-rose/menthe/lilas/vert/corail`) reste **identique entre thèmes** ; l'identité visuelle vient du fond, des traits, des ombres, des rayons et des boutons.

| Token | `manga` (défaut) | `doux` | `pique-nique` |
|---|---|---|---|
| Fond de scène | `#FFF3D6` + damier défilant rgba(255,181,194,.20)/rgba(168,230,207,.18), tuiles 40 px, 9 s | dégradé 160° `#FFF9E6→#FFEDF1→#FBE3EC` | vichy rgba(255,181,194,.20) 18 px bidirectionnel sur `#FFF7EA` |
| Trait (couleur/épaisseur) | `#3A2E2E` / 2.5 px | rgba(58,46,46,.10) / 1.5 px | rgba(224,122,95,.22) / 1.5 px |
| Carte | blanche, rayon 16 px, ombre `5px 6px 0 #3A2E2E` | blanche, rayon 20 px, ombre `0 6px 18px rgba(58,46,46,.06)` | blanche, rayon 18 px, ombre `0 8px 20px rgba(224,122,95,.14)` |
| Bouton primaire | `#E07A5F`, bordure chocolat 2.5 px, ombre `0 4px 0 #3A2E2E`, rayon 14 px | `#4A6741`, sans bordure, ombre `0 3px 0 rgba(58,46,46,.18)`, rayon 999 px | `#E07A5F`, sans bordure, ombre `0 3px 0 #c96a51`, rayon 16 px |
| Bouton secondaire | blanc, bordure/ombre chocolat comme le primaire | blanc translucide, bordure rgba(58,46,46,.14) | rgba(255,181,194,.35) |
| Doodles (opacité) | .16 | .08 | .15 |
| Fond voilé (barres) | rgba(255,243,214,.92) | rgba(255,249,230,.92) | rgba(255,247,234,.92) |

Tokens étendus (constantes tous thèmes, mappés en utilitaires Tailwind via `@theme inline`) : `--texte-doux` rgba(58,46,46,.64) (remplace gray-500/600), `--texte-tres-doux` rgba(58,46,46,.45) (remplace gray-400), `--bordure` rgba(58,46,46,.12) (remplace border-gray-200), `--danger` `#B0413E`, `--fond-voile` ci-dessus.

## Résolutions du builder-check (décisions du builder — à corriger si besoin)

1. **Séquence** : 2d (thèmes) s'exécute **avant** 2c (approuvé par Steve) ; le plan 2c reçoit un amendement de contraintes (hex bruts → classes sémantiques).
2. **Palettes** : extraites du fichier maquette validé et consignées ci-dessus — le plan est déterministe ; une passe de validation visuelle par Steve reste prévue à la fin.
3. **Couverture** : thème + `FondAnime` sur **toutes** les pages (le layout racine lit le cookie ; les fonds opaques `bg-[#FFF9E6]` des wrappers sont retirés pour laisser voir le fond fixe). Le compagnon reste dans `(app)` (il dépend de l'auth) ; `/connexion` garde sa statuette statique ; `/admin/cles` est thématisé par le layout racine (refactor de classes opportuniste).
4. **Tokens étendus** : oui — liste ci-dessus ; les gris Tailwind disparaissent au refactor (lisibilité du thème manga sur fond animé).
5. **Tap sur Miamz** : les bulles d'humeur spontanées restent **inchangées** ; le tap affiche une bulle **contextuelle à la page** (pool par chemin, utilitaire pur `bullesPourChemin(chemin)` sans paramètre d'humeur) avec le rebond existant. La navigation seule ne déclenche rien.

## Ce qui reste au builder

- Réglages fins des valeurs par thème (opacité/densité des doodles, vitesse du damier) — retouche visuelle avec Steve.
- L'ordre exact des doodles et leurs positions.
- Le découpage en tâches et tests du plan d'implémentation.

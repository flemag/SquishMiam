# Design — Plan 2c « Confort d'usage » (recettes, plan, chargements, courses)

Date : 2026-11-17 · Statut : approuvé par Steve (conversation du jour) · Base : `2026-11-16-miamz-design.md`

## Intent et pourquoi

L'app marche, la mascotte vit, mais l'usage quotidien réveille des frottements remontés par Steve lors de la validation mobile du plan 2a : **l'onglet Recettes ne permet ni recherche ni filtrage** (le vrai besoin : « trouver vite LA recette à planifier »), **l'ajout/modification d'un repas dans le Plan est inutilisable au doigt** (formulaire coincé dans une cellule de ~100 px, et le glisser-déposer HTML5 n'existe pas sur tactile), **les chargements sont aveugles** (Google OAuth, navigation entre pages), et la liste de courses devient longue à mesure que les semaines se remplissent. Plan 2c = la passe de confort qui rend l'usage quotidien fluide, **avant** le plan 2b (IA), qui s'appuiera sur ces fondations (la feuille de plan servira aux actions du chat ; la recherche de recettes alimentera les suggestions).

## Objectifs

1. **Recettes** : recherche instantanée (titre **et** ingrédients), filtres par tags et durée, tri, comptage, état vide soigné — le tout côté client, sans aller-retour serveur.
2. **Fiche recette** : consulter les étapes en cuisinant (bottom sheet, même pattern que le Plan).
3. **Plan** : une **bottom sheet universelle** pour créer, modifier (portions), déplacer (jour + service) et supprimer un repas — cibles tactiles ≥ 44 px ; le drag reste un bonus desktop.
4. **Chargements** : des visuels fun et on-brand — Miamz qui roule + messages qui tournent + squelettes pastel de la page à venir (`loading.tsx`), état d'attente sur le bouton Google.
5. **Courses** : rayons repliables (natif `<details>`), progression cochés par rayon.

## Non-objectifs / anti-objectifs

- Pas de filtrage serveur, pas de librairie de recherche (le catalogue est petit ; l'IA le remplira plus tard — le filtrage client restera adapté).
- Pas de fiche recette éditoriale riche (photos, mise en page) — la sheet d'étapes suffit.
- Pas de ré-implémentation du drag tactile : « déplacer vers » couvre le besoin.
- Rien de l'IA (2b) ici ; pas de nouvelle dépendance npm.

## Contraintes (héritées)

- Mobile + desktop : 360 px → desktop, cibles ≥ 44 px, `safe-area`, aucun débordement de page.
- Animations `transform`/`opacity` uniquement ; `prefers-reduced-motion` → tout s'arrête, l'information reste.
- UI 100 % française ; identifiants de domaine en français ; palette pastel / Fredoka.
- Zéro dépendance npm nouvelle ; SVG inline type Lucide (pattern établi dans nav-bar).
- TDD sur la logique pure ; `npm test` + `npm run build` verts à chaque commit.

## Approches considérées (et retenues)

- **Recettes** : (a) filtres serveur via query params — rejeté : latence à chaque frappe, complexité inutile ; (b) filtrage client instantané dans un composant client recevant les recettes — **retenu** ; (c) moteur d'index type lunr — sur-ingénierie.
- **Plan** : (a) page d'édition dédiée — rejeté : navigation lourde pour un geste fréquent ; (b) bottom sheet universelle + drag desktop conservé — **retenu** ; (c) formulaire inline agrandi — ne résout ni les cibles tactiles ni le déplacement.
- **Chargements** : (a) spinner générique — froid, hors marque ; (b) Miamz animé + squelettes de mise en page — **retenu** ; (c) Lottie — dépendance injustifiée.
- **Courses** : `<details>/<summary>` natif accessible — **retenu** (accordéon JS rejeté : inutile).

## Décisions de conception

1. **Recherche partagée** : utilitaire pur `src/lib/recherche-recettes.ts` — normalisation d'accents (NFD, retrait des diacritiques), correspondance titre **ou** noms d'ingrédients (`Recipe.ingredients` est un Json : `[{nom, quantite?, unite?}]`), utilisé par l'onglet Recettes ET la feuille du Plan. Testé.
2. **Onglet Recettes** : `RecettesClient` (client) reçoit les recettes en props depuis la page serveur (déjà fetch) ; recherche sticky sous la barre du haut sur mobile ; chips de tags cumulables (ET logique) ; puces durée `Toutes / ≤ 20 / ≤ 30 / ≤ 45 min` ; tri `Récent / A→Z / Durée` ; « N recette(s) trouvée(s) » ; état vide distinct (aucune recette vs aucun résultat). Tap sur une carte → **sheet d'étapes** (titre, portions, durée, ingrédients, étapes).
3. **Feuille de plan** : `FeuilleRepas` (client, `role="dialog"`, fermeture Esc/arrière-plan) s'ouvre au tap sur une case vide (création) ou occupée (édition) : recherche de recette (réutilise 1), stepper portions `− 2 +` (1-12), « Déplacer vers » (jour + service, masqué si inchangé), Supprimer (implicite : pas de double confirmation, geste réversible en recréant), Enregistrer → API existantes (`POST/ PATCH/ DELETE /api/plan`) + **émission d'événements Miamz inchangée** (émission seulement pour création/suppression, pas pour un déplacement). Le drag desktop reste ; les deux chemins cohabitent.
4. **Chargements** : `ChargementMiamz` (composant partagé) = Miamz avec keyframe `miamz-attente` (roulade : rotation + léger bob) + message FR tournant (« Miamz mijote… », « On fouette les œufs… », « On coupe les petits légumes… », « Ça chauffe ! ») ; `loading.tsx` pour plan/recettes/courses avec squelettes pastel de mise en page (pulse d'opacité, formes des vrais blocs) ; bouton Google en état « Miamz va chercher Google… » (désactivé + animation) pendant la redirection. `prefers-reduced-motion` : Miamz statique, message visible.
5. **Courses** : chaque rayon = `<details open>` avec `<summary>` portant le nom du rayon + « cochés/total » ; la barre de progression générale reste en entête.

## Ce qui reste au builder

- Placement exact des squelettes par page (formes des blocs).
- Détails d'animation de la roulade (durée, courbe) — retouche visuelle avec Steve.
- Le choix des libellés exacts des messages de chargement (pool extensible).
- Découpage fin des tâches et tests (dans le plan d'implémentation).

## Résolutions du builder-check (décisions du builder — à corriger si besoin)

1. **Collision « Déplacer vers »** : les cibles occupées sont **désactivées et annotées « occupé »** — jamais d'écrasement silencieux (l'upsert de POST ne sert pas au déplacement). L'échange de deux repas (swap) est différé. Le drag desktop qui rencontre une case occupée ne déplace pas (comportement actuel) ; la feuille est le chemin universel.
2. **Édition d'un repas** : la recette **est modifiable** dans la feuille (recherche ouverte pré-remplie, `PATCH recipeId`) ; **une modification n'émet aucun événement Miamz** — seuls création (`repas-planifie`) et suppression (`repas-retire`) en émettent, quel que soit le champ modifié.
3. **Suppression d'une recette** : déplacée **dans la fiche** (pied d'actions de la sheet) — la carte devient une unique cible de tap (plus d'interactif imbriqué, a11y). L'édition de recette (`PATCH /api/recipes/[id]`, sans UI aujourd'hui) reste différée.
4. **Contrat de `recherche-recettes.ts`** (verrouillé par tests) : requête découpée en jetons, **tous les jetons** doivent matcher (**ET**), chacun sur le titre **ou** un nom d'ingrédient (**OU**) ; normalisation NFD (retrait des diacritiques) **+ remplacement œ→oe et æ→ae** ; `minutes: null` = incluse dans « Toutes », **exclue** des filtres ≤ 20/30/45, **dernière** au tri par durée.

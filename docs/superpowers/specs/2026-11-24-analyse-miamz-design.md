# Analyse Miamz à la demande — design

Date : 2026-11-24
Statut : proposé (en attente d'approbation)

## Intention

Miamz doit analyser la **vraie** semaine de repas et la **vraie** liste de courses
pour donner des conseils personnalisés (foyer, objectif), au lieu de bulles
génériques. Steve a choisi le mode **à la demande** : rien ne s'affiche tant que
l'utilisateur ne clique pas.

## Objectifs

- Un bouton « Analyser ma semaine » sur le Plan, « Astuces pour mes courses » sur les Courses.
- Une feuille de résultats : 3 à 4 conseils courts + 1 suggestion concrète.
- Les conseils citent le contexte réel (jours vides, recette répétée, catégories, objectif).
- Fonctionne **sans IA** : repli déterministe par règles, comme le chat.
- Mobile 360 px, cibles ≥ 44 px, UI française, zéro nouvelle dépendance.

## Non-objectifs

- Pas de bulle proactive, pas d'analyse automatique à l'ouverture de page.
- Pas de persistance de l'analyse, pas d'historique, pas de notification.
- Pas de modification automatique du plan ou de la liste.

## Anti-objectifs

- Conseils génériques interchangeables.
- Discours culpabilisant sur le poids : on parle d'équilibre et de plaisir.

## Approches

1. **Réutiliser le chat existant** (envoyer un faux message « analyse ma semaine »).
   Moins de code, mais réponse en prose, non structurée, et coût d'historique.
2. **Route dédiée + logique pure + repli local** (choisie). Sortie structurée
   (liste de conseils), testable, fallback garanti, coût d'un appel court.
3. **Analyse 100 % règles locales**. Gratuit et instantané, mais Miamz perd sa
   valeur « IA » et la personnalisation fine.

## Design

### Logique pure — `src/lib/analyse-miamz.ts` (TDD)

- `resumerSemaine(entrees)` : nombre de repas, créneaux remplis, jours sans repas,
  recettes répétées, catégories/tags présents.
- `conseilsLocaux({ semaine, courses, profil })` : 3–4 conseils déterministes
  priorisés (semaine vide → planifier ; jours vides ; même recette 2+ fois ;
  peu de variété ; objectif perte de poids + peu de légumes ; liste vide).
- `construireContexteAnalyse(...)` : texte compact pour le prompt.
- `parserAnalyseIa(contenu)` : JSON strict `{ conseils: string[], suggestion?: string }`,
  borné (4 conseils max, 160 caractères chacun), sinon `null` → repli local.

### API — `POST /api/miamz/analyse`

Corps `{ portee: "semaine" | "courses", semaine?: "YYYY-MM-DD" }`.
Charge profil + repas de la semaine + liste de courses, appelle l'IA
(`demanderReponseIa`, 8 s, ~400 tokens), et renvoie
`{ conseils, suggestion, source: "ia" | "local" }`. Toute erreur/quota → repli local.

### UI — `src/components/miamz/analyse.tsx`

Bouton déclencheur (passé en prop par la page) + `FeuilleModale` :
chargement (« Miamz réfléchit… »), liste de conseils, suggestion en encart,
mention discrète « Analyse locale » quand l'IA n'a pas répondu.
Boutons placés dans l'en-tête du Plan et des Courses.

### Coût / garde-fous

Un appel IA par clic, timeout 8 s, pas de retry, pas de cache. Aucun coût au chargement.

## Ce qui reste au bâtisseur

Libellés exacts des boutons, mise en page de la feuille, seuils des règles
(ex. « peu de variété » = moins de 3 catégories distinctes).

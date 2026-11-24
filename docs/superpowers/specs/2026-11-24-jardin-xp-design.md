# Jardin XP — design

Date : 2026-11-24
Statut : proposé (en attente d'approbation)
Approche retenue : **B — XP + plantes avec animations de croissance**

## Intention

Gamifier l'usage de SquishMiam : chaque action (planifier, cuisiner, valider, ajouter
une recette) rapporte des XP. Le niveau monte et débloque des plantes dans un jardin
virtuel affiché sur la page Profil. Les plantes poussent avec des animations CSS.

## Objectifs

- Champ `xp Int @default(0)` sur User (migration additive).
- Logique pure testable : calcul du niveau, XP manquants, plantes débloquées, XP par action.
- 10 niveaux avec plantes qui débloquent progressivement.
- Animations CSS de croissance (graine → pousse → fleur) via `@keyframes`.
- Affichage sur la page Profil : niveau, barre de progression, jardin de plantes.
- Miamz réagit au niveau (message selon le niveau).
- Mobile 360 px, cibles ≥ 44 px, zéro nouvelle dépendance, `prefers-reduced-motion`.

## Non-objectifs

- Pas de leaderboard / comparaison entre utilisateurs.
- Pas de monnaie XP séparée des jetons (XP = progression, jetons = monnaie).
- Pas de défis hebdomadaires (approche C, plus tard).
- Pas de jardin interactif (arroser, récolter).

## Design

### XP par action

| Action | XP |
|--------|-----|
| Planifier un repas | +5 |
| Cocher un article de courses | +2 |
| Ajouter une recette | +10 |
| Valider une recette boutique | +15 |
| Semaine complète (7 jours avec ≥1 repas) | +50 |

### Niveaux et plantes

| Niveau | XP requis | Plante débloquée |
|--------|-----------|------------------|
| 1 | 0 | 🌱 Graine |
| 2 | 50 | 🌿 Pousse |
| 3 | 150 | 🌸 Fleur |
| 4 | 300 | 🌻 Tournesol |
| 5 | 500 | 🌳 Arbre |
| 6 | 800 | 🌴 Palmier |
| 7 | 1200 | 🌵 Cactus |
| 8 | 1700 | 🍄 Champignon |
| 9 | 2300 | 🌺 Hibiscus |
| 10 | 3000 | 🌲 Sapin |

### Logique pure — `src/lib/jardin.ts` (TDD)

- `NIVEAUX: { niveau, xpRequis, plante, emoji }[]`
- `calculerNiveau(xp: number): { niveau, xpActuel, xpPourSuivant, progression }`
- `plantesDebloquees(xp: number): { emoji, nom, niveau }[]`
- `xpPourAction(action: ActionXp): number`
- `type ActionXp = "repas_planifie" | "course_cochee" | "recette_ajoutee" | "recette_validee" | "semaine_complete"`

### Migration Prisma

- Ajouter `xp Int @default(0)` sur User (additive).

### Intégration XP

- Routes existantes : `POST /api/plan` (+5), `PATCH /api/courses/[id]` (+2 si coché), `POST /api/recipes` (+10), `POST /api/recipes/[id]/validate` (+15), cron/check semaine complète (+50).
- Helper `ajouterXp(userId, amount, raison)` dans `src/lib/xp.ts` : met à jour `user.xp` + crée une `XpTransaction` (nouveau modèle ? ou réutiliser TokenTransaction avec reason "xp:..."). 

Décision : réutiliser `TokenTransaction` avec `reason: "xp:<action>"` et `amount` = XP. Pas de nouveau modèle.

### UI — page Profil

- Niveau actuel + barre de progression (XP actuel / XP pour le niveau suivant).
- Jardin : grille de plantes débloquées (2 colonnes mobile, 3 tablette).
- Chaque plante : emoji + nom + niveau de déblocage, avec animation de croissance au déblocage.
- Message Miamz selon le niveau (« Tu es au niveau 3 ! Continue ! »).

### Animations CSS

- `@keyframes pousse` : scale 0 → 1 avec opacity, durée 0,6 s.
- `@keyframes fleurit` : scale + rotation légère pour les fleurs.
- `prefers-reduced-motion` : désactive les animations.

## Ce qui reste au bâtisseur

Libellés exacts des messages Miamz par niveau, couleurs de la barre, taille des plantes, seuils de niveau (peuvent être ajustés).

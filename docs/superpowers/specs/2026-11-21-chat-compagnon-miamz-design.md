# Compagnon IA Miamz & Chat interactif — design

Date : 2026-11-21
Statut : validé

## Intention et pourquoi

Aujourd'hui, Miamz est présent visuellement au coin de l'écran avec ses humeurs et ses bulles contextuelles, mais l'utilisateur ne peut pas lui parler. 
Le chat compagnon transforme Miamz en un véritable **assistant culinaire interactif** : il répond aux questions (« On mange quoi ce soir ? », « Une idée rapide en 20 min ? »), s'appuie sur le carnet de recettes réelles de l'utilisateur et son planning en cours, et anime ses expressions en direct au fil des réponses.

---

## Objectifs

1. **Ouverture du chat Miamz** :
   - Accessible depuis le widget Miamz (clic sur Miamz ou bouton dans sa bulle contextuelle) sous forme de feuille modale (`FeuilleModale`) ergonomique sur mobile et desktop.
   - En-tête avec Miamz animé reflétant l'humeur de la conversation.
2. **Dialogue culinaire personnalisé** :
   - Miamz connaît les recettes de l'utilisateur (`db.recipe`) et les repas déjà planifiés cette semaine pour faire des recommandations pertinentes et éviter les doublons.
   - Suggestions de questions rapides au premier message (« Qu'est-ce qu'on mange ce soir ? », « Idée rapide en moins de 20 min », « Repas végétarien »).
3. **Synchronisation texte ↔ humeur** :
   - Chaque réponse renvoie une intention d'humeur (`content`, `fier`, `affame`, `repu`, `motive`, `fete`, `calin`, `taquin`, `inquiet`, `surpris`) qui anime Miamz dans le chat.
4. **Boutons d'action interactifs** :
   - Quand Miamz cite ou propose une recette, des boutons interactifs permettent d'aller voir la recette ou de basculer vers le planning.
5. **Mode dégradé « Charme local » (zéro blocage)** :
   - Si l'API OpenRouter est indisponible, sans clé ou en quota dépassé, Miamz bascule immédiatement sur un algorithme local qui choisit astucieusement parmi les recettes de l'utilisateur.

---

## Non-objectifs

- Pas de persistance complexe d'historique en base (historique conservé pendant la session de navigation pour éviter de gonfler Postgres).
- Pas d'agent autonome qui modifie la base sans confirmation de l'utilisateur (l'utilisateur valide toujours via les boutons d'action).
- Pas de requêtes lourdes (historique limité aux 6 derniers échanges pour limiter la consommation de tokens OpenRouter).

---

## Architecture technique

### Endpoint API `POST /api/miamz/chat`
- **Sécurité** : session utilisateur active.
- **Entrée** : `{ message: string, historique?: { role: "user" | "assistant", content: string }[] }`
- **Contexte injecté** :
  - Liste des recettes de l'utilisateur (titres, durées, tags, catégories).
  - Repas déjà prévus pour la semaine courante.
- **Sortie `200`** :
  ```ts
  {
    reponse: string;
    humeur: HumeurId;
    actions?: {
      label: string;
      lien: string;
    }[];
  }
  ```

---

## Contraintes

- Zéro nouvelle dépendance npm.
- Mobile 360 px : zone de saisie tactile confortable, défilement fluide des messages.
- TDD sur le moteur de prompt et de parsing de réponse.
- `npm test` et `npm run build` verts à chaque étape.

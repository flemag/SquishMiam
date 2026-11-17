# Design — Miamz, l'app de gestion des repas avec compagnon vivant

Date : 2026-11-16 · Statut : prêt pour validation finale

## Intent et pourquoi

Steve veut une **web app de gestion des repas**, très riche en fonctionnalités, avec une **assistance quotidienne** réelle. La concurrence (Jow, Yazio, Mealime — qui ferme en octobre 2026) couvre la boucle planifier → courses → cuisiner → suivre, mais avec des interfaces froides et génériques. La différenciation de Miamz : **un compagnon IA avec un visage, un caractère et une évolution** — Miamz, une boulette de riz kawaii (style Sanrio/Disney) qui vit dans l'app, réagit aux vraies actions de l'utilisateur, le conseille, écrit ses rapports, et grandit avec lui. Succès = l'app devient un rituel quotidien agréable qui réduit la charge mentale (« on mange quoi ce soir ? »), le gaspillage et le budget.

## Utilisateurs et contexte

- Moins de **10 utilisateurs**, usage léger : cercle privé (famille/amis).
- **Un utilisateur principal** (Steve) avec **son** Miamz : niveau, XP, humeurs et historique de chat lui appartiennent ; **toute la gamification est réservée à l'utilisateur principal**.
- **Foyer en option** : l'utilisateur principal peut y inviter des membres pour s'organiser (plan partagé, liste, votes, portions) — Miamz aide et conseille les membres, mais eux n'accumulent pas d'XP ni de niveau.
- Tout doit fonctionner **100 % gratuit** (hébergement, base, auth, IA). L'utilisateur fournira une **clé API OpenRouter gratuite** pour les fonctions IA.
- **Accès à l'app par clés d'activation** à durée limitée, générées par l'admin (voir fonctionnalité 15) — prévu pour pouvoir vendre des clés plus tard.
- Langue de l'interface : français.

## Objectifs

- Au minimum la **parité fonctionnelle** avec Jow/Yazio/Mealime : calendrier des repas de la semaine, liste de courses auto-générée et triée, base de recettes + **import de recettes par URL**, suivi nutritionnel (y compris par photo), objectifs.
- Une **mascotte-compagnon vivante** omniprésente : dialogue, conseils, analyses et rapports, humeurs animées synchronisées avec ses messages.
- De la **gamification** liée aux vraies actions : XP partagé entre Miamz et le **jardin virtuel**, niveaux d'évolution de Miamz, défis, badges.
- Un **stock/frigo avec dates limites (DLC)** en option par utilisateur, avec alertes push et recettes anti-gaspillage.
- Assistance quotidienne proactive : **notifications push** (PWA) et **rappels planifiés** (cron).

### Non-objectifs

- Pas d'application mobile native (PWA uniquement).
- Pas de commerce intégré / lien avec les enseignes (pas de panier Jow cliquable vers Carrefour, etc.).
- Pas de scan de code-barres géant type base Open Food Facts exhaustive (peut venir plus tard).
- Pas de réseau social public, pas de partage hors du foyer.

### Anti-objectifs (ce qui serait un échec)

- Une mascotte gadget qu'on remarque une fois puis qu'on ignore : elle doit être **intégrée à toutes les interactions**.
- Des coûts : aucun dépassement des free tiers (Vercel Hobby, Neon Free, modèles gratuits OpenRouter).
- Une app complexe à prendre en main : le quotidien doit être fluide (le soir, 30 secondes pour valider demain).

## Contraintes

- Budget : 0 € (free tiers seulement). < 10 utilisateurs légers.
- Clé OpenRouter fournie par Steve — **côté serveur uniquement**, jamais exposée au navigateur.
- Hébergement : **Vercel** (compte existant), base : **Neon** (PostgreSQL, compte existant), code : **GitHub**.
- Le rendu graphique de la mascotte doit être **riche et vivant** : animations fluides (Lottie ou Rive, gratuits), pas des images figées.

## Approches considérées (comment construire)

1. **App 100 % conversationnelle** (tout passe par le chat avec la mascotte). Rejeté : un calendrier de repas ou une liste de courses se gèrent mal en pur chat ; contredit l'exigence de parité avec la concurrence.
2. **App structurée + compagnon omniprésent** (choisi) : l'app classique (calendrier, listes, stats) avec Miamz en compagnon permanent qui commente, conseille, anime. Meilleur des deux mondes.
3. **Dashboard data-first** avec mascotte secondaire. Rejeté : perd la différenciation émotionnelle, c'est le modèle froid de la concurrence.

## La mascotte : Miamz

- **Design** : boulette de riz onigiri kawaii — gros yeux brillants, joues roses, feuille verte sur la tête (maquettes SVG validées par Steve). Style Sanrio/Disney, palette pastel bonbon : rose `#FFB5C2`, menthe `#A8E6CF`, crème `#FFF9E6`, lavande `#C9B6E4`, plus touches terracotta/terres. Typographie ronde (famille Fredoka ou équivalent).
- **Évolution** (liée aux vraies actions ; XP partagé avec le jardin) :
  - Niv. 1 — Grain de riz : petit, timide, curieux
  - Niv. 2 — Miamz : la feuille pousse, il suggère des recettes
  - Niv. 3 — Miamz Chef : bandana rouge + cuillère, planifie et encadre
  - Niv. MAX — Miamz Légende : couronne d'or, aura, yeux étoilés
- **Système d'humeurs (exigence forte de Steve)** :
  - Grande variété d'humeurs : content, fier, déçu mais encourageant, affamé, repu, endormi, en fête, concentré, câlin, taquin, inquiet, surpris, motivé, relax…
  - **3 à 4 variantes d'animation par humeur** pour éviter la répétition et rendre chaque personnage vivant.
  - Un **moteur d'humeur** côté client combine : heure du jour, événements (défi réussi, gaspillage évité, DLC proche, streak), résultats bons/mauvais du jour (budget, équilibre), et contexte (frigo vide, semaine planifiée…).
  - **Synchronisation texte ↔ animation obligatoire** : le ton du message généré par l'IA et l'expression de Miamz sont choisis ensemble (une intention d'humeur est demandée à l'IA avec sa réponse, ou dérivée localement, et pilote l'animation).
  - Vie permanente : clignement continu, il **suit le curseur du regard**, rebondit au clic, danse en cas de célébration, bâille tard le soir.

## Fonctionnalités

### Cœur (parité concurrence)
1. **Calendrier des repas** : planification de la semaine par jour/déjeuner-dîner, glisser-déposer, portions par personne.
2. **Base de recettes** : création manuelle + **import par URL** (l'app lit une page de recette et la structure), tags (régime, durée, coût).
3. **Liste de courses auto** : agrégée depuis le plan de la semaine, triée par rayons, cochable, synchronisée foyer.
4. **Suivi des repas** : marquer « mangé », photo du plat avec analyse nutritionnelle IA approximative (modèles gratuits OpenRouter, vision), historique.
5. **Comptes utilisateurs** : inscription Google + lien magique email, foyer partagé invitable.

### Différenciation
6. **Miamz** : chat compagnon, conseils, humeurs animées, réactions en direct aux actions — et il **apprend les préférences** (goûts, détests, habitudes, plats du moment) au fil des interactions pour affiner suggestions et ton.
7. **Jardin virtuel** : pousse avec le même XP que Miamz ; visuel de récompense collective du foyer.
8. **« On mange quoi ce soir ? »** : mode décision — l'IA pèse stock, DLC proches, budget, effort disponible, météo (optionnel) et propose 3 options.
9. **Photo du frigo** : l'IA identifie les ingrédients sur une photo → inventaire du stock + recettes anti-gaspillage.
10. **Rapports hebdo « coach »** : narrés par Miamz (argent économisé, équilibre, variété, gaspillage évité), partageables dans le foyer.
11. **Gamification** : XP, niveaux de Miamz, défis hebdo (semaine végé, zéro gaspillage, budget tenu), badges (Cocotte pond des œufs-badges).
12. **Stock + DLC (optionnel par utilisateur)** : inventaire avec dates limites, alertes push configurables, priorité aux produits proches de la limite dans les suggestions.

### Assistance quotidienne
13. **Notifications push web** (PWA installable) : menu du lendemain le soir, suggestion à 18h, alertes DLC, célébrations.
14. **Cron** (Vercel Cron) : génère rapports, rafraîchit défis, déclenche rappels.

### Accès & données nutritionnelles
15. **Clés d'activation avec date limite** : l'app n'est accessible qu'avec une clé valide générée par l'**admin** (Steve). Chaque clé a une durée (ex. 7 j, 30 j, illimité), s'active à la première connexion, expire automatiquement. Interface admin minimale : générer, lister, révoquer. Conçu pour pouvoir vendre des clés plus tard ; pour le cercle privé, Steve génère des clés longues.
16. **Scan de code-barres (Open Food Facts)** : API ouverte gratuite sans clé — nutrition (calories, macros) rattachée aux produits scannés via la caméra (PWA). Enrichit le suivi nutritionnel et les rapports « équilibre » sans saisie manuelle.

## Stack (décisions prises, validées par le contexte gratuit)

- **Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui** — un seul projet full-stack, déployé sur Vercel.
- **PostgreSQL Neon + Prisma** — free tier très au-delà des besoins.
- **Auth.js (NextAuth v5)** — **Google OAuth uniquement** (pas de domaine disponible ; magic links email abandonnés).
- **OpenRouter** côté serveur (route handlers), sélection de modèles gratuits, clé en variable d'environnement ; mise en cache des réponses pour limiter la consommation.
- **PWA** (next-pwa ou équivalent) + **Web Push** (VAPID, gratuit) pour les notifications.
- **Lottie (lottie-web) ou Rive** pour les animations de la mascotte — gratuits.
- **Vercel Cron** pour les tâches planifiées.

## Décisions complémentaires (round builder-check)

Décisions prises au niveau du design, à corriger si Steve préfère autrement :

- **Calendrier des repas au niveau du foyer** (cohérent avec le mode foyer et les votes déjà validés) : un `MealPlan` appartient au `Household` ; chaque membre peut l'éditer ; portions réglées par personne ; modifications simultanées rares (<10 utilisateurs), dernière écriture gagne avec journal d'activité.
- **Assistance « à 18 h » avec Vercel Hobby** : un seul cron quotidien à 17:00 UTC (≈ 18 h France, tous les utilisateurs au même fuseau). Pas d'ordonnanceur externe.
- **Source des maquettes de la mascotte** : `docs/superpowers/specs/assets/` (copies des écrans de brainstorm validés).
- **Rythme de validation des animations** : 3 passes avec validation de Steve à chaque passe — (1) esquisses statiques des humeurs clés, (2) rig + animations des 4-5 humeurs principales, (3) variantes restantes.
- **Authentification** : Google OAuth comme seule méthode garantie ; magic link email en option si un domaine vérifié est disponible.
- **Mode dégradé IA** : quota OpenRouter gratuit épuisé → Miamz passe en « charme local » (réponses modèles prédéfinies + moteur d'humeur côté client, qui ne consomme jamais d'IA).

## Réponses de Steve (round builder-check — intégrées ci-dessus)

1. **Miamz personnel + gamification réservée à l'utilisateur principal** : Steve est l'utilisateur principal avec son compagnon ; le foyer est optionnel (organisation, conseils) mais les membres n'accumulent pas d'XP.
2. **Miamz propose et apprend** : chat conversationnel avec propositions (boutons d'action de confirmation), et apprentissage continu des préférences — pas d'agent autonome en v1.
3. **Prix optionnels** + **Open Food Facts (API gratuite sans clé)** pour les codes-barres → assistance macros/calories crédible sans sous-système payant ni saisie lourde.
4. **100 % gratuit strict** pour l'IA (quota :free + mode dégradé « charme local ») — mais ajout d'un **système de clés d'activation à durée limitée** géré par un rôle admin, prévu pour une future vente de clés.
5. **Pas de domaine** : authentification Google uniquement.

## Ce qui reste à décider par le builder

- Choix final Lottie vs Rive (et pipeline de production des animations : librairies gratuites vs création).
- Schéma Prisma détaillé (entités : User avec rôles admin/principal/membre, LicenseKey, Household, Recipe, MealPlan, GroceryList/Item, StockItem, Preference, XpEvent, Challenge, Badge, Message…).
- Sélection précise des modèles OpenRouter gratuits (chat + vision), stratégie de fallback et de cache.
- Librairie de scan code-barres côté web (BarcodeDetector natif vs html5-qrcode/zxing) et intégration Open Food Facts.
- Mécanisme d'apprentissage des préférences de Miamz (entités, extraction depuis les conversations vs les actions).
- Détails de la décomposition composant de la mascotte (couplage moteur d'humeur ↔ animations).

## Boutique de recettes (futur — annoncé par Steve, 2026-11-17)

Une **boutique** sera construite par la suite pour proposer des recettes **gratuites et payantes, ouvertes à tout le monde** (au-delà du cercle privé <10 utilisateurs). Le **mode de monétisation reste à décider** (argent, publicité, ou autre) — Steve y réfléchira plus tard ; rien à construire maintenant.

Implications à garder en tête pour les futurs plans (non chiffrées, à redéfinir au moment venu) :

- **Modèle de données** : `Recipe` devra distinguer privé / public / boutique, avec un prix éventuel et un auteur ; les recettes publiques vivront hors du cloisonnement par utilisateur actuel.
- **Monétisation** : la contrainte « 100 % gratuit » vise l'infrastructure — un paiement en ligne (Stripe, Lemon Squeezy…) prélève une commission ; alternatives à évaluer : vente de clés d'activation (l'infrastructure existe déjà, cf. système de clés admin), plateformes type Ko-fi / Buy Me a Coffee, ou publicité.
- **Périmètre technique alors ajouté** : vitrine publique, pages recettes publiques référençables, achat/rachat, modération, potentiellement comptes visiteurs sans invitation.

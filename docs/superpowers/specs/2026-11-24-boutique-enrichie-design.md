# Boutique enrichie — design

Date : 2026-11-24
Statut : proposé (en attente d'approbation)

## Intention

Enrichir la boutique communautaire avec des articles variés : thèmes visuels,
accessoires Miamz, packs de recettes. Certains gratuits, d'autres payables en
jetons. L'admin gère le catalogue complet (CRUD).

## Objectifs

- Nouveau modèle `BoutiqueItem` : type, nom, description, prix (0 = gratuit), image,
  metadata JSON, actif, createdAt.
- Champ `purchasedItems String[]` sur User (IDs des articles achetés).
- Champ `activeTheme String?` et `activeAccessory String?` sur User.
- Admin : CRUD complet (créer, modifier, supprimer, activer/désactiver).
- Public : catalogue filtrable par type, achat avec jetons, application thème/accessoire.
- Packs de recettes : l'achat ajoute les recettes du pack à la cuisine de l'utilisateur.
- Mobile 360 px, cibles ≥ 44 px, zéro nouvelle dépendance.

## Non-objectifs

- Pas de système d'abonnement.
- Pas d'inventaire avec équipement/déséquipement complexe (v1 : application directe).
- Pas de marketplace entre utilisateurs (l'admin est le seul vendeur).
- Pas de système de reviews/ratings sur les articles.

## Types d'articles

| Type | Description | Metadata |
|------|-------------|----------|
| `theme` | Palette de couleurs pour l'app | `{ primary, secondary, accent, background, text }` |
| `accessoire` | Accessoire pour Miamz | `{ emoji, position: "tete" \| "corps" }` |
| `pack` | Collection de recettes | `{ recipeIds: string[] }` |

## Approche retenue : A — Catalogue simple + achat direct

- Admin crée/modifie/supprime des articles via `/admin/boutique-catalogue`.
- Utilisateur voit le catalogue, filtre par type, achète avec ses jetons.
- Les articles achetés sont stockés dans `purchasedItems` sur User.
- Thèmes/accessoires appliqués via le profil (sélecteur).
- Packs : l'achat copie les recettes du pack dans la cuisine de l'utilisateur.

## Migration Prisma

- `BoutiqueItem` model (nouveau).
- `purchasedItems String[]` sur User.
- `activeTheme String?` et `activeAccessory String?` sur User.

## Anti-objectifs

- Un article payant acheté deux fois (idempotence).
- Un thème qui casse l'UI (validation des couleurs).
- Un pack avec des recettes inexistantes.

## Ce qui reste au bâtisseur

Libellés exacts, icônes par type, animation d'achat, textes de confirmation.

# Compagnon IA Miamz & Chat interactif — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner la parole à Miamz via un chat interactif intégré qui conseille, propose des repas selon les recettes réelles et le planning, anime ses humeurs et propose des boutons d'actions.

**Architecture:**
1. Logique pure `src/lib/chat-miamz.ts` : formatage du contexte de cuisine, parsing robuste de la réponse IA (JSON avec tolérance texte) et moteur de secours « charme local ».
2. Route serveur `POST /api/miamz/chat` : charge les recettes et le planning de la semaine, interroge OpenRouter ou bascule en local.
3. Composant client `src/components/miamz/feuille-chat.tsx` : interface de dialogue kawaii avec bulles, humeurs animées et suggestions.
4. Intégration dans `src/components/miamz/compagnon.tsx`.

**Tech Stack:** Next.js 15, React 19, TypeScript, OpenRouter API, Tailwind v4, Vitest. Zéro nouvelle dépendance npm.

**Spec:** `docs/superpowers/specs/2026-11-21-chat-compagnon-miamz-design.md`

## Global Constraints

- Zéro nouvelle dépendance npm.
- TDD sur la logique pure (formatage, parsing, fallback charme local).
- Mode dégradé garanti : Miamz doit toujours répondre même si OpenRouter est hors-ligne ou sans clé.
- Mobile 360 px : saisie confortable, pas de débordement horizontal, cibles ≥ 44 px.
- `npm test` et `npm run build` verts à chaque tâche.

---

### Task 1: Logique pure de formatage, parsing et charme local (TDD)

**Files:**
- Create: `src/lib/chat-miamz.ts`
- Test: `tests/chat-miamz.test.ts`

**Interfaces:**
```ts
export type ReponseMiamz = {
  reponse: string;
  humeur: HumeurId;
  actions?: { label: string; lien: string }[];
};

export type ContexteCuisine = {
  recettes: { id: string; title: string; minutes?: number | null; tags: string[]; categorieNom?: string | null }[];
  repasPrevus: { dateIso: string; slot: string; titre: string }[];
};

export function formaterContexteCuisine(contexte: ContexteCuisine): string;
export function parserReponseMiamz(texteBrut: string, recettesDisponibles: { id: string; title: string }[]): ReponseMiamz;
export function reponseCharmeLocal(message: string, contexte: ContexteCuisine): ReponseMiamz;
```

- [ ] **Step 1: Écrire les tests unitaires (TDD)**
- [ ] **Step 2: Vérifier l'échec initial (RED)**
- [ ] **Step 3: Implémenter `src/lib/chat-miamz.ts`**
- [ ] **Step 4: Vérifier le passage des tests (GREEN)**
- [ ] **Step 5: Gate `npm test` et commit**

---

### Task 2: Route API `POST /api/miamz/chat`

**Files:**
- Create: `src/app/api/miamz/chat/route.ts`

- [ ] **Step 1: Vérification de l'authentification**
- [ ] **Step 2: Requête Prisma pour charger les recettes et le planning de la semaine**
- [ ] **Step 3: Appel OpenRouter avec prompt système Miamz et timeout 8s**
- [ ] **Step 4: Fallback automatique sur `reponseCharmeLocal` si échec réseau/quota**
- [ ] **Step 5: Gate `npm test` + `npm run build` et commit**

---

### Task 3: Composant client `FeuilleChatMiamz`

**Files:**
- Create: `src/components/miamz/feuille-chat.tsx`

- [ ] **Step 1: Modale de chat avec en-tête Miamz animé reflétant l'humeur active**
- [ ] **Step 2: Liste des messages avec styles kawaii (bulles utilisateur & Miamz)**
- [ ] **Step 3: Rendu des boutons d'actions interactifs**
- [ ] **Step 4: Zone de saisie + suggestions initiales cliquables (« On mange quoi ce soir ? »)**
- [ ] **Step 5: Gate `npm test` + `npm run build` et commit**

---

### Task 4: Intégration dans le widget `Compagnon`

**Files:**
- Modify: `src/components/miamz/compagnon.tsx`

- [ ] **Step 1: Bouton « 💬 Discuter » dans la bulle contextuelle de Miamz**
- [ ] **Step 2: Gestion de l'ouverture et fermeture de la feuille de chat**
- [ ] **Step 3: Vérification du rendu 360 px et de la fluidité des animations**
- [ ] **Step 4: Gate `npm test` + `npm run build` et commit**

---

### Task 5: Vérification finale et déploiement Vercel

- [ ] **Step 1: Suite complète de tests (`npm test`)**
- [ ] **Step 2: Build de production (`npm run build`)**
- [ ] **Step 3: Push sur `origin/main` (déploiement automatique Vercel)**

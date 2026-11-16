# Plan 2a — Miamz prend vie (moteur d'humeurs + animations) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la mascotte Miamz vivante et omniprésente : widget compagnon animé dans toutes les pages, moteur d'humeurs pur (heure + événements + contexte semaine), 3-4 variantes d'animation par humeur, bulles de messages locaux synchronisés avec l'expression.

**Architecture:** Logique pure testée (`evaluerHumeur`, `pickVariante`, `pickMessage`, `regardVers`) dans `src/lib/`, composants clients dans `src/components/miamz/` (fournisseur d'événements React + widget compagnon). Les animations sont des keyframes CSS sur le SVG validé (transforms/opacity uniquement, compositor-friendly) — pas de Lottie/Rive : le rendu kawaii validé par Steve est déjà un SVG maîtrisé, et les keyframes CSS donnent les variantes sans dépendance ni asset externe (décision laissée au builder par la spec, § « Ce qui reste à décider »). Aucune IA dans ce plan : les humeurs déclenchées par le chat le seront au plan 2b, branchées sur le même moteur.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, keyframes CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-16-miamz-design.md` (§ « La mascotte : Miamz » et § « Décisions complémentaires » : mode dégradé = charme local, ce plan en est le socle).

**Découpage:** Plan 2a (ce document) = la vie, sans IA. Plan 2b = OpenRouter serveur + cache + mode dégradé, chat avec boutons d'action, intentions d'humeur IA, apprentissage des préférences, import de recettes par URL, photo du frigo.

## Global Constraints

- **Optimisation mobile + desktop obligatoire** : chaque écran et le widget compagnon doivent être pleinement utilisables de 360 px (mobile) à desktop — cible tactile (tap, pas de survol requis), tailles de touch ≥ 44 px, `safe-area-inset` respecté, pas de débordement horizontal de page (un scroll horizontal volontaire est toléré pour la grille hebdo).
- 100 % gratuit : aucune clé d'API dans ce plan, aucune dépendance payante ni asset sous licence.
- Interface 100 % en français (messages des bulles, aria-labels).
- Identifiants de code : noms de domaine en français (convention établie : `rayons.ts`, `courses.ts`, `plan.ts`), verbes techniques en anglais.
- Palette pastel : rose `#FFB5C2`, menthe `#A8E6CF`, crème `#FFF9E6`, lavande `#C9B6E4`, vert sauge `#4A6741`, terracotta `#E07A5F`.
- Animations : uniquement `transform` et `opacity` (compositor GPU) ; aucune animation de propriétés de layout.
- `prefers-reduced-motion: reduce` → toutes les animations coupées, l'information reste (humeur visible à l'arrêt).
- Tous les tests passent avec `npm test` avant chaque commit ; `npm run build` vert avant chaque push.

## Review Focus

1. **Rerender sans dérive** : le même contexte + même graine doit donner la même humeur — pas de `Math.random` dans le moteur (l'aléa n'existe que dans le choix de variante, semé) — testé Task 2 (`evaluerHumeur` déterministe).
2. **Frontières horaires** : à 22h59 `relax`, à 23h00 `endormi` ; à 17h59 rien, à 18h00 `affame` si semaine vide — testé Task 2 (dates construites à la minute).
3. **Rafale d'événements** (glisser-déposer de 3 repas en 2 s) : le dernier événement gagne, aucune accumulation de timers ni d'humeur figée — testé Task 2 (`dernierEvenement` remplace) + Task 5 (une seule source d'événement, pas de setTimeout par événement).
4. **Le widget ne doit ni capter les clics des éléments sous sa zone morte, ni pousser la mise en page, ni masquer le contenu sur mobile** : zone cliquable = le SVG seul, position fixed sans impact layout, taille et marges réduites sous 640 px, au-dessus de la `safe-area` — vérifié Task 4 (manual pass 360 px + desktop) et codé via `pointer-events` + media query.
5. **`prefers-reduced-motion`** : tout s'arrête proprement, l'humeur reste lisible (posture/yeux) — vérifié Task 4 (manual pass), codé en CSS media query unique.

---

### Task 1: Catalogue d'humeurs, variantes et messages (pur)

**Files:**
- Create: `src/lib/humeurs.ts`
- Test: `tests/humeurs.test.ts`

**Interfaces:**
- Produces: `HUMEURS` (liste des 14 ids), `type HumeurId`, `VARIANTES_PAR_HUMEUR: Record<HumeurId, number>` (3 ou 4 par humeur), `pickVariante(humeur: HumeurId, graine: number): number` (0..N-1, déterministe), `pickMessage(humeur: HumeurId, graine: number): string` (pool FR de 3-4 messages par humeur, déterministe). Consommés par Tasks 2, 4, 5.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { HUMEURS, VARIANTES_PAR_HUMEUR, pickVariante, pickMessage } from "@/lib/humeurs";

describe("catalogue", () => {
  it("contient les 14 humeurs de la spec", () => {
    expect(HUMEURS).toHaveLength(14);
    expect(HUMEURS).toContain("fete");
    expect(HUMEURS).toContain("endormi");
  });

  it("chaque humeur a 3 ou 4 variantes et au moins 3 messages", () => {
    for (const h of HUMEURS) {
      expect(VARIANTES_PAR_HUMEUR[h]).toBeGreaterThanOrEqual(3);
      expect(VARIANTES_PAR_HUMEUR[h]).toBeLessThanOrEqual(4);
      expect(pickMessage(h, 0)).toBeTruthy();
    }
  });
});

describe("pickVariante", () => {
  it("est déterministe et reste dans les bornes", () => {
    expect(pickVariante("content", 42)).toBe(pickVariante("content", 42));
    for (let g = 0; g < 200; g++) {
      expect(pickVariante("content", g)).toBeGreaterThanOrEqual(0);
      expect(pickVariante("content", g)).toBeLessThan(VARIANTES_PAR_HUMEUR.content);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | Select-String "Failed to resolve"`
Expected: FAIL — `@/lib/humeurs` n'existe pas.

- [ ] **Step 3: Implémenter `src/lib/humeurs.ts`**

Table `VARIANTES_PAR_HUMEUR` à la main (3 ou 4 par humeur), pools de messages FR par humeur (ton Miamz : tutoiement, chou/clins d'œil cuisine), `pickVariante`/`pickMessage` = modulo de la graine sur le tableau correspondant. Pas de `Math.random`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (toutes suites).

- [ ] **Step 5: Commit**

```bash
git add src/lib/humeurs.ts tests/humeurs.test.ts
git commit -m "feat: mood catalogue with seeded variants and local messages"
```

### Task 2: Moteur d'humeur pur (règles et priorités)

**Files:**
- Create: `src/lib/moteur-humeur.ts`
- Test: `tests/moteur-humeur.test.ts`

**Interfaces:**
- Consumes: `HumeurId` de Task 1.
- Produces: `type EvenementMiamz = "repas-planifie" | "repas-retire" | "course-cochee" | "recette-creee" | "semaine-complete"` ; `type ContexteMiamz = { maintenant: Date; repasSemaine: number; dernierEvenement: { type: EvenementMiamz; ilYAms: number } | null }` ; `evaluerHumeur(ctx: ContexteMiamz): HumeurId`. Consommés par Tasks 4 et 5.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { evaluerHumeur } from "@/lib/moteur-humeur";

const base = { repasSemaine: 5, dernierEvenement: null };

describe("evaluerHumeur", () => {
  it("endormi de 23h00 à 5h59, content sinon par défaut", () => {
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 23, 0) })).toBe("endormi");
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 5, 59) })).toBe("endormi");
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 6, 0) })).toBe("content");
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 14, 0) })).toBe("content");
  });

  it("relax de 21h à 23h si la semaine est déjà fournie", () => {
    expect(evaluerHumeur({ ...base, maintenant: new Date(2026, 0, 15, 21, 0) })).toBe("relax");
  });

  it("affame entre 18h et 21h si aucun repas planifié", () => {
    expect(
      evaluerHumeur({ ...base, repasSemaine: 0, maintenant: new Date(2026, 0, 15, 18, 30) })
    ).toBe("affame");
    expect(
      evaluerHumeur({ ...base, repasSemaine: 5, maintenant: new Date(2026, 0, 15, 18, 30) })
    ).not.toBe("affame");
  });

  it("fete si semaine-complete de moins de 5 min — prioritaire sur l'heure", () => {
    const ctx = {
      ...base,
      repasSemaine: 14,
      dernierEvenement: { type: "semaine-complete" as const, ilYAms: 4 * 60 * 1000 },
      maintenant: new Date(2026, 0, 15, 23, 30), // même la nuit
    };
    expect(evaluerHumeur(ctx)).toBe("fete");
  });

  it("concentre juste après une planification, motive après une recette, taquin après courses cochées", () => {
    const ev = (type: any, ms: number) => ({ ...base, dernierEvenement: { type, ilYAms: ms }, maintenant: new Date(2026, 0, 15, 12, 0) });
    expect(evaluerHumeur(ev("repas-planifie", 10_000))).toBe("concentre");
    expect(evaluerHumeur(ev("recette-creee", 60_000))).toBe("motive");
    expect(evaluerHumeur(ev("course-cochee", 10_000))).toBe("taquin");
  });

  it("fier à partir de 10 repas planifiés (hors événements récents)", () => {
    expect(evaluerHumeur({ ...base, repasSemaine: 10, maintenant: new Date(2026, 0, 15, 14, 0) })).toBe("fier");
  });

  it("le dernier événement remplace le précédent (rafale)", () => {
    const ctx = { ...base, dernierEvenement: { type: "repas-retire" as const, ilYAms: 5_000 }, maintenant: new Date(2026, 0, 15, 12, 0) };
    expect(evaluerHumeur(ctx)).toBe("content"); // pas d'humeur collée aux vieux événements
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | Select-String "Failed to resolve"`
Expected: FAIL — `@/lib/moteur-humeur` n'existe pas.

- [ ] **Step 3: Implémenter `src/lib/moteur-humeur.ts`**

Chaîne de règles dans l'ordre de priorité (retourner à la première vraie) :
1. `fete` — `dernierEvenement.type === "semaine-complete"` et `ilYAms < 5 * 60_000`
2. `endormi` — heure locale dans [23, 6)
3. `concentre` — `repas-planifie` < 60_000 ms
4. `motive` — `recette-creee` < 120_000 ms
5. `taquin` — `course-cochee` < 60_000 ms
6. `affame` — [18, 21) et `repasSemaine === 0`
7. `relax` — [21, 23) et `repasSemaine > 0`
8. `fier` — `repasSemaine >= 10`
9. `content` — défaut

Heure locale = `maintenant.getHours()` (l'appelant — navigateur — passe sa propre horloge ; les tests construisent des Dates explicites). `repas-retire` ne déclenche rien (retombe sur les règles). Les humeurs `decu`, `calin`, `inquiet`, `surpris`, `repu` restent sans déclencheur local : activées au plan 2b (chat IA), elles sont déjà dans le catalogue de Task 1.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/moteur-humeur.ts tests/moteur-humeur.test.ts
git commit -m "feat: pure mood engine with priority rules and time boundaries"
```

### Task 3: Regard qui suit le curseur (pur)

**Files:**
- Create: `src/lib/regard.ts`
- Test: `tests/regard.test.ts`

**Interfaces:**
- Produces: `regardVers(curseurX: number, curseurY: number, boite: { x: number; y: number; largeur: number; hauteur: number }, porteeMax?: number): { dx: number; dy: number }` — décalage max en px (défaut 3), direction vers le curseur. Consommé par Task 4.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { regardVers } from "@/lib/regard";

const boite = { x: 100, y: 100, largeur: 80, hauteur: 80 }; // centre (140, 140)

describe("regardVers", () => {
  it("regarde vers le curseur et sature à porteeMax", () => {
    const droite = regardVers(1000, 140, boite);
    expect(droite.dx).toBe(3);
    expect(droite.dy).toBe(0);

    const coin = regardVers(5000, 5000, boite);
    expect(Math.abs(coin.dx)).toBeLessThanOrEqual(3);
    expect(Math.abs(coin.dy)).toBeLessThanOrEqual(3);
    expect(coin.dx).toBeGreaterThan(0);
    expect(coin.dy).toBeGreaterThan(0);
  });

  it("ne regarde nulle part si le curseur est au centre", () => {
    const centre = regardVers(140, 140, boite);
    expect(centre.dx).toBe(0);
    expect(centre.dy).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | Select-String "Failed to resolve"`
Expected: FAIL.

- [ ] **Step 3: Implémenter `src/lib/regard.ts`**

Vecteur centre→curseur, normalisé, multiplié par `porteeMax`, magnitude bornée. Déplacement horizontal seulement à ±3 px : au-delà, les yeux sortiraient du visage.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/regard.ts tests/regard.test.ts
git commit -m "feat: bounded eye-tracking math for companion"
```

### Task 4: Widget Compagnon vivant (SVG animé + bulle)

**Files:**
- Create: `src/components/miamz/compagnon.tsx`
- Create: `src/components/miamz/contexte.ts` (`MiamzContext = createContext<EtatMiamz | null>(null)` — le provider arrive en Task 5 ; défaut `null`)
- Modify: `src/app/globals.css` (keyframes variantes + `prefers-reduced-motion`)
- Modify: `src/components/miamz-statuette.tsx` (extraire le SVG dans un `MiamzSvg` réutilisable paramétrable : taille, yeux `{dx, dy}`, bouche ouverte/fermée, posture — consommé par la statuette NavBar ET le compagnon)

**Interfaces:**
- Consumes: `evaluerHumeur` + types (Task 2), `pickVariante`/`pickMessage` (Task 1), `regardVers` (Task 3).
- Produces: `<Compagnon />` (client, fixed bas-droite, zone cliquable = SVG seul) ; `MiamzContext` (défaut `null` — le compagnon tolère son absence : humeur `content`, pas d'événements) ; `MiamzSvg` avec props de pose. Le CSS définit `.miamz-anim[data-humeur="…"][data-variante="…"]` → keyframes (`miamz-bob`, `miamz-sway`, `miamz-wiggle`, `miamz-spin`, `miamz-droop`, `miamz-snore`…), et une seule media query `prefers-reduced-motion: reduce` qui coupe tout.

- [ ] **Step 1: Extraire `MiamzSvg`** depuis `miamz-statuette.tsx` : props `{ taille: number; yeux: { dx: number; dy: number }; bouche: "sourire" | "baille" | "rond"; pose: HumeurId; variante: number }`. La statuette NavBar appelle avec pose `content`, variante 0, yeux nuls — zéro changement visuel.

- [ ] **Step 2: Écrire le composant `Compagnon`** — `useState` humeur/variante/bulle ; `evaluerHumeur` recalculé : au montage, toutes les 30 s (intervalle), et à chaque événement du contexte ; graine = minute courante (stabilité intra-minute, variété inter-minutes) ; `mousemove` fenêtre → `regardVers` sur la boîte du SVG (`getBoundingClientRect`) ; `onClick` sur le SVG → classe `miamz-bounce` 600 ms + bulle de message de l'humeur ; bulle visible 6 s puis masquée ; aria-label « Miamz, ton compagnon repas ».

- [ ] **Step 3: Écrire les keyframes** dans `globals.css` — 3-4 variantes par humeur mappées en `data-attributes` (transform/opacity uniquement) + media query reduced-motion. Bouche `baille` pour `endormi`, yeux mi-clos via `scaleY(0.35)` sur le groupe yeux.

- [ ] **Step 4: Rendre le compagnon responsive et tactile** — taille du widget : ~72 px desktop, ~56 px sous 640 px (media query), position `fixed` bas-droite avec `max(env(safe-area-inset-bottom), 1rem)` ; bulle max `min(16rem, calc(100vw - 2rem))` ; le regard ne suit QUE le pointeur souris (`mousemove` — absent au tactile : au toucher, les yeux restent au centre et une lente dérive idle anime le regard) ; le tap déclenche rebond + bulle (même handler que le clic) ; `z-index` sous les futurs overlays, `pointer-events: none` sur la bulle.

- [ ] **Step 4: Vérifier**

Run: `npm test` (les suites pures restent vertes) et `npm run build`
Expected: PASS + build vert.

- [ ] **Step 5: Manual pass responsive** — DevTools 360×800 (mobile) et 1440×900 (desktop) : le widget ne chevauche aucun bouton/action, tap fonctionne, bulle lisible ; scroller la page ne bouge pas le widget.

- [ ] **Step 6: Commit**

```bash
git add src/components/miamz/ src/components/miamz-statuette.tsx src/app/globals.css
git commit -m "feat: living companion widget with mood animations and speech bubble"
```

### Task 5: Événements de l'app + câblage omniprésent

**Files:**
- Create: `src/components/miamz/fournisseur-etat.ts` (réduction pure) + `tests/fournisseur-etat.test.ts`
- Create: `src/components/miamz/fournisseur.tsx` (provider React)
- Modify: `src/app/(app)/layout.tsx` (compte de repas de la semaine en props initiales ; `FournisseurMiamz` englobe les enfants ; `<Compagnon />` monté)
- Modify: `src/components/plan/grille.tsx`, `src/components/courses/liste.tsx`, `src/components/recettes/recette-card.tsx`, `src/app/(app)/recettes/nouvelle/page.tsx` (émettre les événements après succès de chaque mutation)

**Interfaces:**
- Consumes: `EvenementMiamz`, `evaluerHumeur` (Task 2), `MiamzContext` (Task 4).
- Produces: `type EtatMiamz = { repasSemaine: number; dernierEvenement: { type: EvenementMiamz; ilYAms: number } | null; semaineCompleteEmise: boolean }` ; `prochainEtat(etat: EtatMiamz, evenement: EvenementMiamz, maintenant: Date): EtatMiamz` (pur) ; `useMiamz()` (contexte React, provider `FournisseurMiamz` avec `repasSemaine` initial en prop) — `emettre` met à jour `dernierEvenement` (horodatage local) et incrémente/décrémente `repasSemaine` pour `repas-planifie`/`repas-retire` ; émet `semaine-complete` quand `repasSemaine` atteint 14 (une seule fois par session).

- [ ] **Step 1: Write the failing test** (logique du fournisseur extraite pure)

```ts
import { describe, it, expect } from "vitest";
import { prochainEtat } from "@/components/miamz/fournisseur-etat";

describe("prochainEtat", () => {
  it("incrémente les repas et horodate le dernier événement", () => {
    const etat = prochainEtat(
      { repasSemaine: 3, dernierEvenement: null, semaineCompleteEmise: false },
      "repas-planifie",
      new Date(2026, 0, 15, 12, 0)
    );
    expect(etat.repasSemaine).toBe(4);
    expect(etat.dernierEvenement?.type).toBe("repas-planifie");
  });

  it("émet semaine-complete une seule fois à 14 repas", () => {
    const premier = prochainEtat({ repasSemaine: 13, dernierEvenement: null, semaineCompleteEmise: false }, "repas-planifie", new Date());
    expect(premier.dernierEvenement?.type).toBe("semaine-complete");
    expect(premier.semaineCompleteEmise).toBe(true);
    const apres = prochainEtat(premier, "repas-retire", new Date());
    const retour = prochainEtat(apres, "repas-planifie", new Date());
    expect(retour.dernierEvenement?.type).toBe("repas-planifie"); // pas de re-émission
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test 2>&1 | Select-String "Failed to resolve"`
Expected: FAIL.

- [ ] **Step 3: Implémenter `fournisseur-etat.ts` (réduction pure) + `fournisseur.tsx` (contexte React qui l'utilise)** — `prochainEtat(etat, evenement, maintenant)` porte toute la logique ; le provider se contente de `useReducer(prochainEtat, etatInitial)` et expose `useMiamz`.

- [ ] **Step 4: Câbler le layout et les émetteurs** — `(app)/layout.tsx` : compter les entrées de la semaine courante (`weekStart` de `src/lib/plan.ts`) → `repasSemaine` initial ; brancher les 4 émetteurs après les `fetch` réussis ; monter `<Compagnon />` dans le provider.

- [ ] **Step 5: Vérifier**

Run: `npm test` puis `npm run build`
Expected: PASS + build vert.

- [ ] **Step 6: Commit**

```bash
git add src/components/miamz/ "src/app/(app)/layout.tsx" src/components/plan/ src/components/courses/ src/components/recettes/ "src/app/(app)/recettes/"
git commit -m "feat: app events feed the mood engine, companion on every page"
```

### Task 6: Déploiement + validation visuelle (passes 1-2 de la spec)

**Files:**
- Modify: rien de prévu — retouches CSS/SVG issues de la validation

**Interfaces:**
- Consumes: tout le plan. Produces: la v0.2 validée par Steve.

- [ ] **Step 1: Vérifier puis pousser** — `npm test` + `npm run build` verts, `git push` → deploy Vercel automatique.

- [ ] **Step 2: Validation visuelle avec Steve** (spec : 3 passes, les passes 1-2 ici) — sur prod, **desktop ET téléphone réel** : (a) les humeurs clés : `endormi` la nuit, `affame` à 18h+ semaine vide, `fete` à la 14e planification, `concentre`/`motive`/`taquin` après actions ; (b) le regard suit le curseur (desktop), rebond au clic/tap, bulles FR synchronisées ; (c) `prefers-reduced-motion` (émuler dans DevTools) coupe tout. Parcours complet mobile : connexion, recette, planning (scroll horizontal de la grille acceptable, aucune action bloquée), courses cochables au pouce. Retouches immédiates si Steve n'est pas satisfait (une itération comprise).

- [ ] **Step 3: Tag**

```bash
git tag -a v0.2.0-miamz-vivant -m "Plan 2a: mascotte vivante (moteur d'humeurs, animations, regard, bulles)"
git push origin v0.2.0-miamz-vivant
```

# Analyse Miamz à la demande — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Miamz analyse la semaine et la liste de courses à la demande et renvoie 3–4 conseils personnalisés (foyer + objectif), avec repli local garanti.

**Architecture:** Logique pure testée (`analyse-miamz.ts`) → route `POST /api/miamz/analyse` (IA courte + repli règles) → composant client `AnalyseMiamz` monté dans les en-têtes Plan et Courses.

**Tech Stack:** Next.js 15 (App Router), Prisma, Vitest, Tailwind existant. Zéro nouvelle dépendance.

**Spec:** `docs/superpowers/specs/2026-11-24-analyse-miamz-design.md`

## Global Constraints

- UI française, tutoiement, jamais de culpabilisation sur le poids.
- Mobile 360 px sans débordement ; cibles tactiles ≥ 44 px (`min-h-11`).
- Tout clic qui attend affiche un retour visuel (bouton désactivé + libellé d'attente).
- Animations transform/opacity uniquement, respect `prefers-reduced-motion`.
- Aucune nouvelle dépendance npm.
- `npm test` et `npm run build` verts avant chaque commit.
- Un seul appel IA par clic, `timeoutMs: 8000`, `maxTokens: 400`, aucun retry, aucun cache.
- Git hors PATH : `"C:\Program Files\Git\cmd\git.exe"`.

## Review Focus

- **Semaine vide (nouvel utilisateur)** : conseils utiles et non culpabilisants, jamais une liste vide.
- **Semaine pleine (21 repas)** : aucun conseil absurde du type « il reste des jours vides ».
- **Liste de courses vide ou entièrement cochée** : message adapté, pas « il te manque tout ».
- **Réponse IA malformée / quota épuisé** : repli local, jamais de JSON brut affiché, jamais d'erreur bloquante.
- **Objectif perte de poids sans légumes** : conseil bienveillant, sans discours moralisateur.

---

### Task 1: Logique pure d'analyse

**Files:**
- Create: `src/lib/analyse-miamz.ts`
- Test: `tests/analyse-miamz.test.ts`

**Interfaces:**
- Consumes: `phraseProfil({ householdSize, goal })` de `src/lib/profil.ts`.
- Produces:
  - `type EntreeSemaine = { dateIso: string; slot: string; titre: string; categorieNom: string | null; tags: string[] }`
  - `type ItemCourses = { nom: string; rayon: string; checked: boolean }`
  - `type ProfilAnalyse = { householdSize: number; goal: string }`
  - `type ResumeSemaine = { nbRepas: number; joursRemplis: string[]; joursVides: string[]; repetitions: { titre: string; fois: number }[]; categories: string[]; titresDistincts: number; nbCreneauxVides: number }`
  - `type Analyse = { conseils: string[]; suggestion: string | null }`
  - `resumerSemaine(dates: string[], entrees: EntreeSemaine[]): ResumeSemaine`
  - `conseilsLocaux({ resume, courses, profil }: { resume: ResumeSemaine; courses: ItemCourses[]; profil: ProfilAnalyse }): Analyse`
  - `construireContexteAnalyse({ dates, entrees, courses, profil }: { dates: string[]; entrees: EntreeSemaine[]; courses: ItemCourses[]; profil: ProfilAnalyse }): string`
  - `parserAnalyseIa(contenu: string): Analyse | null`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from "vitest";
import {
  resumerSemaine,
  conseilsLocaux,
  construireContexteAnalyse,
  parserAnalyseIa,
  type EntreeSemaine,
  type ItemCourses,
} from "@/lib/analyse-miamz";

const DATES = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"];
const PROFIL = { householdSize: 2, goal: "equilibre" };
const entree = (dateIso: string, titre: string, categorieNom: string | null = null, tags: string[] = []): EntreeSemaine => ({
  dateIso, slot: "DINER", titre, categorieNom, tags,
});

describe("resumerSemaine", () => {
  it("compte repas, jours vides et répétitions", () => {
    const r = resumerSemaine(DATES, [
      entree("2026-11-23", "Pâtes"),
      entree("2026-11-24", "Pâtes"),
      entree("2026-11-25", "Salade", "Végétarien", ["végé"]),
    ]);
    expect(r.nbRepas).toBe(3);
    expect(r.joursRemplis).toEqual(["2026-11-23", "2026-11-24", "2026-11-25"]);
    expect(r.joursVides).toHaveLength(4);
    expect(r.nbCreneauxVides).toBe(18);
    expect(r.repetitions).toEqual([{ titre: "Pâtes", fois: 2 }]);
    expect(r.categories).toEqual(["Végétarien"]);
    expect(r.titresDistincts).toBe(2);
  });

  it("gère une semaine vide et une semaine pleine", () => {
    expect(resumerSemaine(DATES, []).joursVides).toHaveLength(7);
    const pleine = DATES.flatMap((d) => [
      entree(d, `A-${d}`), entree(d, `B-${d}`), entree(d, `C-${d}`),
    ]);
    const r = resumerSemaine(DATES, pleine);
    expect(r.nbRepas).toBe(21);
    expect(r.joursVides).toEqual([]);
    expect(r.nbCreneauxVides).toBe(0);
  });
});

describe("conseilsLocaux", () => {
  it("invite à planifier quand la semaine est vide", () => {
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, []),
      courses: [],
      profil: PROFIL,
    });
    expect(r.conseils.length).toBeGreaterThan(0);
    expect(r.conseils.join(" ").toLowerCase()).toContain("vide");
    expect(r.suggestion).not.toBeNull();
  });

  it("signale les répétitions et les jours vides", () => {
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, [entree("2026-11-23", "Pâtes"), entree("2026-11-24", "Pâtes")]),
      courses: [{ nom: "Pâtes", rayon: "Épicerie", checked: false }],
      profil: PROFIL,
    });
    const texte = r.conseils.join(" ");
    expect(texte).toContain("Pâtes");
    expect(texte.toLowerCase()).toContain("jour");
  });

  it("ne dépasse jamais 4 conseils et reste bienveillant sur le poids", () => {
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, [entree("2026-11-23", "Pâtes"), entree("2026-11-24", "Pâtes")]),
      courses: [],
      profil: { householdSize: 1, goal: "perte_poids" },
    });
    expect(r.conseils.length).toBeLessThanOrEqual(4);
    const texte = r.conseils.join(" ").toLowerCase();
    expect(texte).toContain("légume");
    expect(texte).not.toMatch(/gross|régime strict|maigrir vite/);
  });

  it("félicite quand tout est coché et que la semaine est remplie", () => {
    const pleine = DATES.flatMap((d) => [entree(d, `A-${d}`), entree(d, `B-${d}`), entree(d, `C-${d}`)]);
    const r = conseilsLocaux({
      resume: resumerSemaine(DATES, pleine),
      courses: [{ nom: "Riz", rayon: "Épicerie", checked: true }],
      profil: PROFIL,
    });
    expect(r.conseils.length).toBeGreaterThan(0);
    expect(r.conseils.join(" ").toLowerCase()).toMatch(/coch|bravo|prêt/);
  });
});

describe("construireContexteAnalyse", () => {
  it("inclut le profil, les repas et la liste", () => {
    const texte = construireContexteAnalyse({
      dates: DATES,
      entrees: [entree("2026-11-23", "Pâtes", "Italien")],
      courses: [{ nom: "Riz", rayon: "Épicerie", checked: false }],
      profil: { householdSize: 3, goal: "perte_poids" },
    });
    expect(texte).toContain("3 personnes");
    expect(texte).toContain("Pâtes");
    expect(texte).toContain("Riz");
    expect(texte).toContain("perdre du poids");
  });
});

describe("parserAnalyseIa", () => {
  it("lit un JSON valide, même dans un bloc ```json", () => {
    const r = parserAnalyseIa('```json\n{"conseils":["A","B"],"suggestion":"Cuisine des légumes"}\n```');
    expect(r).toEqual({ conseils: ["A", "B"], suggestion: "Cuisine des légumes" });
  });

  it("borne à 4 conseils et 160 caractères", () => {
    const r = parserAnalyseIa(
      JSON.stringify({ conseils: ["1", "2", "3", "4", "5"], suggestion: "x".repeat(400) })
    );
    expect(r?.conseils).toHaveLength(4);
    expect(r?.suggestion?.length).toBe(160);
  });

  it("renvoie null pour une réponse inexploitable", () => {
    expect(parserAnalyseIa("pas du json")).toBeNull();
    expect(parserAnalyseIa('{"conseils":[]}')).toBeNull();
    expect(parserAnalyseIa("null")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/analyse-miamz.test.ts`
Expected: FAIL — module `@/lib/analyse-miamz` introuvable.

- [ ] **Step 3: Implement `src/lib/analyse-miamz.ts`**

Règles de `conseilsLocaux`, dans cet ordre, **max 4 conseils** :
1. `nbRepas === 0` → « Ta semaine est encore vide : ajoute 2–3 repas pour commencer. » + suggestion « Ouvre le planning et remplis le dîner de ce soir. ».
2. `joursVides.length > 0` → « Il reste N jour(s) sans repas (citer les 2 premiers, format court). ».
3. `repetitions` (fois ≥ 2) → « « X » revient N fois cette semaine : varie les plaisirs. » (première répétition seulement).
4. `nbRepas >= 3 && titresDistincts < 3` → « Ajoute un peu de variété : un plat de légumes, de poisson ou de légumineuses. ».
5. `goal === "perte_poids"` et aucune entrée dont tags/catégorie matche `/végé|legume|légume|salade|poisson|soupe/i` → « Pour ton objectif, mise sur des assiettes de légumes rassasiantes. ».
6. `courses.length === 0` → « Ta liste de courses est vide : elle se remplit toute seule depuis le planning. ».
7. `courses.length > 0 && courses.every(c => c.checked)` → « Toute la liste est cochée, bravo : ton panier est prêt ! ».
8. Si aucun conseil produit → « Ta semaine a l'air équilibrée : continue comme ça ! ».

`construireContexteAnalyse` : liste datée des repas (`- 2026-11-23 (DINER) : Pâtes [Italien]`), liste de courses (`- Riz (Épicerie) — à acheter / coché`), puis `phraseProfil(profil)`.

`parserAnalyseIa` : retirer les fences ```, `JSON.parse`, exiger `conseils` tableau non vide de chaînes ; trim, filtrer vides, `slice(0, 4)`, chaque conseil `slice(0, 160)` ; `suggestion` string trim `slice(0, 160)` sinon `null` ; toute erreur → `null`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/analyse-miamz.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/analyse-miamz.ts tests/analyse-miamz.test.ts
git commit -m "feat: add pure Miamz analysis logic"
```

---

### Task 2: Route API d'analyse

**Files:**
- Create: `src/app/api/miamz/analyse/route.ts`

**Interfaces:**
- Consumes: `resumerSemaine`, `conseilsLocaux`, `construireContexteAnalyse`, `parserAnalyseIa`, types de Task 1 ; `demanderReponseIa` ; `phraseProfil` ; `weekStart`, `formatDateIso`, `getWeekDates` de `@/lib/plan`.
- Produces: `POST /api/miamz/analyse` → `{ conseils: string[]; suggestion: string | null; source: "ia" | "local" }`.

- [ ] **Step 1: Implement the route**

Corps attendu : `{ portee: "semaine" | "courses", semaine?: "YYYY-MM-DD" }`.
- 401 si non authentifié ; 400 si `portee` invalide.
- `debut = weekStart(semaine valide ? new Date(semaine) : new Date())` ; `dates = getWeekDates(debut).map(formatDateIso)`.
- Charger en parallèle : repas de `[debut, debut+7j)` avec `recipe: { select: { title, tags, categorie: { select: { nom } } } }`, la liste de courses de `weekStart = debut`, et le profil (`householdSize`, `goal`).
- Construire `EntreeSemaine[]`, `ItemCourses[]`, `ProfilAnalyse` (défauts : 1, `"equilibre"`).
- `repli = conseilsLocaux({ resume, courses, profil })`.
- Appeler `demanderReponseIa` avec un prompt système : rôle Miamz, contexte complet, profil, consigne « 3 à 4 conseils concrets, 160 caractères max chacun, tutoiement, jamais culpabilisant, JSON strict `{"conseils": [...], "suggestion": "..."}` », puis `{ role: "user", content: "Analyse ma semaine." }` (`maxTokens: 400`, `temperature: 0.5`, `timeoutMs: 8000`).
- `ia = contenu ? parserAnalyseIa(contenu) : null` ; réponse = `ia ?? repli`, `source = ia ? "ia" : "local"`. Aucune exception ne doit sortir : tout échec → repli.

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: compilation verte, route `ƒ /api/miamz/analyse` listée.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/miamz/analyse/route.ts
git commit -m "feat: add Miamz analysis API with local fallback"
```

---

### Task 3: Feuille d'analyse et branchement Plan / Courses

**Files:**
- Create: `src/components/miamz/analyse.tsx`
- Modify: `src/app/(app)/plan/page.tsx` (en-tête, à côté des liens de semaine)
- Modify: `src/app/(app)/courses/page.tsx` (en-tête, à côté des flèches)

**Interfaces:**
- Consumes: `POST /api/miamz/analyse`, `FeuilleModale` (`ouvert`, `onFermer`, `titre`, `footer`), `messageErreur`.
- Produces: `export default function AnalyseMiamz({ portee, semaine, label }: { portee: "semaine" | "courses"; semaine: string; label: string })`.

- [ ] **Step 1: Implement `AnalyseMiamz`**

- Bouton déclencheur `className="bouton-secondaire min-h-11"` affichant `label`.
- Au clic : ouvrir la feuille et lancer immédiatement `fetch("/api/miamz/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portee, semaine }) })`.
- Pendant l'attente : `aria-busy`, texte « Miamz réfléchit… », bouton désactivé.
- Résultat : `<ul>` de conseils (puce 🍙), suggestion dans un encart `bg-[#A8E6CF]/15`, mention « Analyse locale » si `source === "local"`.
- Erreur réseau : « Analyse impossible — réessaie. » + bouton « Réessayer » (relance le fetch).
- Footer : bouton « Fermer » `min-h-11 w-full`.
- Aucune animation hors transform/opacity ; pas de timer.

- [ ] **Step 2: Wire into Plan page**

Dans `src/app/(app)/plan/page.tsx`, importer `AnalyseMiamz` et l'ajouter dans le groupe de droite de l'en-tête (avec les liens ← Semaine / Semaine →), en passant `portee="semaine"` et `semaine={formatDateIso(debut)}`.

- [ ] **Step 3: Wire into Courses page**

Dans `src/app/(app)/courses/page.tsx`, importer `AnalyseMiamz` et l'ajouter dans le groupe de droite, avec `portee="courses"` et `semaine={formatDateIso(debut)}`. Sur mobile, les trois contrôles doivent tenir sur 360 px : autoriser le retour à la ligne (`flex-wrap`) sans débordement horizontal.

- [ ] **Step 4: Verify build and tests**

Run: `npm test` puis `npm run build`
Expected: 175 tests verts (165 + 10), build vert.

- [ ] **Step 5: Commit**

```bash
git add src/components/miamz/analyse.tsx "src/app/(app)/plan/page.tsx" "src/app/(app)/courses/page.tsx"
git commit -m "feat: add on-demand Miamz analysis on plan and courses"
```

---

### Task 4: Gate final et déploiement

**Files:** aucun (vérification).

- [ ] **Step 1: Full suite**

Run: `npm test`
Expected: tous les fichiers verts.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: vert, aucune erreur ESLint/TypeScript.

- [ ] **Step 3: Scope check**

Run: `git diff --stat 32ba255..HEAD -- src tests package.json prisma/schema.prisma`
Expected: uniquement les fichiers des tâches 1 à 3 ; `package.json` et `prisma/schema.prisma` absents du diff.

- [ ] **Step 4: Push**

```bash
git push origin main
```
Expected: déploiement Vercel automatique.

- [ ] **Step 5: Mettre à jour le ledger**

Ajouter dans `.superpowers/sdd/2026-11-24-boutique-communautaire/progress.md` une section « Post-chantier » listant les commits livrés (quick-add planning, profil foyer, boutique nav, analyse Miamz).

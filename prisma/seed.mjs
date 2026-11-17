/**
 * Seed Miamz — recettes de démarrage (10, thèmes variés).
 * Rattachées au premier compte ADMIN (Steve). Idempotent : les titres déjà
 * présents sont ignorés, on peut relancer sans créer de doublons.
 *
 * Lancement : npx prisma db seed   (ou node prisma/seed.mjs)
 */

if (!process.env.DATABASE_URL) {
  // Chargement minimal du .env local — évite la dépendance dotenv.
  const fs = await import("node:fs");
  for (const ligne of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();

const RECETTES = [
  {
    title: "Pâtes crémeuses tomate-basilic",
    servings: 2,
    minutes: 20,
    tags: ["végé", "rapide"],
    ingredients: [
      { nom: "pâtes penne", quantite: 300, unite: "g" },
      { nom: "tomates cerises", quantite: 400, unite: "g" },
      { nom: "ail", quantite: 2, unite: "pièce" },
      { nom: "basilic", quantite: 1, unite: "pièce" },
      { nom: "parmesan", quantite: 50, unite: "g" },
      { nom: "huile d'olive", quantite: 2, unite: "cl" },
      { nom: "sel", quantite: 1, unite: "pièce" },
    ],
    steps: [
      "Faire bouillir une grande casserole d'eau salée et cuire les pâtes al dente.",
      "Pendant ce temps, faire revenir l'ail et les tomates cerises dans l'huile d'olive 8 min, en écrasant les tomates à la fourchette.",
      "Hors du feu, ajouter une louche d'eau de cuisson, le parmesan râpé et le basilic ciselé.",
      "Mélanger les pâtes à la sauce, ajuster en sel et servir aussitôt.",
    ],
  },
  {
    title: "Carbonara express",
    servings: 4,
    minutes: 20,
    tags: ["rapide", "familial"],
    ingredients: [
      { nom: "spaghetti", quantite: 400, unite: "g" },
      { nom: "lardons", quantite: 200, unite: "g" },
      { nom: "œufs", quantite: 3, unite: "pièce" },
      { nom: "parmesan", quantite: 80, unite: "g" },
      { nom: "poivre", quantite: 1, unite: "pièce" },
    ],
    steps: [
      "Cuire les spaghetti al dente dans une grande casserole d'eau salée.",
      "Faire dorer les lardons à sec dans une poêle.",
      "Fouetter les œufs avec le parmesan et beaucoup de poivre.",
      "Mélanger pâtes égouttées, lardons et préparation œufs-parmesan hors du feu (la chaleur des pâtes crée la sauce).",
      "Servir immédiatement avec un peu de parmesan supplémentaire.",
    ],
  },
  {
    title: "Gratin de courgettes",
    servings: 4,
    minutes: 45,
    tags: ["végé", "four"],
    ingredients: [
      { nom: "courgettes", quantite: 600, unite: "g" },
      { nom: "crème fraîche", quantite: 20, unite: "cl" },
      { nom: "emmental", quantite: 100, unite: "g" },
      { nom: "ail", quantite: 2, unite: "pièce" },
      { nom: "huile d'olive", quantite: 1, unite: "cl" },
      { nom: "sel", quantite: 1, unite: "pièce" },
      { nom: "poivre", quantite: 1, unite: "pièce" },
    ],
    steps: [
      "Préchauffer le four à 200 °C.",
      "Couper les courgettes en rondelles et les faire revenir 10 min avec l'ail et l'huile d'olive.",
      "Les disposer dans un plat, napper de crème, saler, poivrer.",
      "Parsemer d'emmental râpé et enfourner 25 min jusqu'à ce que le dessus soit doré.",
    ],
  },
  {
    title: "Poulet rôti citron-thym et pommes de terre",
    servings: 4,
    minutes: 60,
    tags: ["familial", "four"],
    ingredients: [
      { nom: "cuisses de poulet", quantite: 800, unite: "g" },
      { nom: "pommes de terre", quantite: 600, unite: "g" },
      { nom: "citron", quantite: 1, unite: "pièce" },
      { nom: "thym", quantite: 2, unite: "pièce" },
      { nom: "huile d'olive", quantite: 3, unite: "cl" },
      { nom: "ail", quantite: 3, unite: "pièce" },
      { nom: "sel", quantite: 1, unite: "pièce" },
      { nom: "poivre", quantite: 1, unite: "pièce" },
    ],
    steps: [
      "Préchauffer le four à 210 °C.",
      "Couper les pommes de terre en quartiers, les déposer dans un grand plat avec les cuisses de poulet.",
      "Arroser d'huile d'olive, ajouter le citron en rondelles, l'ail en chemise et le thym, saler, poivrer.",
      "Enfourner 45 min en remuant les pommes de terre à mi-cuisson.",
      "Laisser reposer 5 min avant de servir.",
    ],
  },
  {
    title: "Curry de pois chiches au lait de coco",
    servings: 4,
    minutes: 30,
    tags: ["végé", "épicé"],
    ingredients: [
      { nom: "pois chiches", quantite: 2, unite: "boîte" },
      { nom: "lait de coco", quantite: 40, unite: "cl" },
      { nom: "tomates concassées", quantite: 1, unite: "boîte" },
      { nom: "oignon", quantite: 1, unite: "pièce" },
      { nom: "ail", quantite: 2, unite: "pièce" },
      { nom: "curry", quantite: 5, unite: "g" },
      { nom: "riz basmati", quantite: 250, unite: "g" },
      { nom: "coriandre", quantite: 1, unite: "pièce" },
    ],
    steps: [
      "Faire cuire le riz basmati selon les indications du paquet.",
      "Faire revenir l'oignon et l'ail émincés dans une sauteuse, ajouter le curry et laisser torréfier 1 min.",
      "Verser les tomates concassées, le lait de coco et les pois chiches égouttés.",
      "Mijoter 15 min à feu doux, saler.",
      "Servir sur le riz avec de la coriandre ciselée.",
    ],
  },
  {
    title: "Salade de riz au thon",
    servings: 2,
    minutes: 20,
    tags: ["froid", "rapide", "économique"],
    ingredients: [
      { nom: "riz", quantite: 200, unite: "g" },
      { nom: "thon", quantite: 1, unite: "boîte" },
      { nom: "tomates", quantite: 2, unite: "pièce" },
      { nom: "concombre", quantite: 1, unite: "pièce" },
      { nom: "maïs", quantite: 1, unite: "boîte" },
      { nom: "vinaigre", quantite: 2, unite: "cl" },
      { nom: "huile d'olive", quantite: 3, unite: "cl" },
    ],
    steps: [
      "Cuire le riz et le laisser refroidir (ou le rincer à l'eau froide pour aller plus vite).",
      "Couper les tomates et le concombre en dés.",
      "Égoutter le thon et le maïs.",
      "Tout mélanger dans un saladier, assaisonner de vinaigre et d'huile d'olive.",
      "Réserver au frais 15 min avant de servir.",
    ],
  },
  {
    title: "Soupe anti-gaspi du frigo",
    servings: 4,
    minutes: 35,
    tags: ["végé", "anti-gaspi", "léger"],
    ingredients: [
      { nom: "potiron", quantite: 400, unite: "g" },
      { nom: "carottes", quantite: 2, unite: "pièce" },
      { nom: "poireau", quantite: 1, unite: "pièce" },
      { nom: "navet", quantite: 1, unite: "pièce" },
      { nom: "bouillon de légumes", quantite: 1, unite: "l" },
      { nom: "crème fraîche", quantite: 10, unite: "cl" },
      { nom: "sel", quantite: 1, unite: "pièce" },
      { nom: "poivre", quantite: 1, unite: "pièce" },
    ],
    steps: [
      "Éplucher et couper grossièrement tous les légumes.",
      "Les faire suer 5 min dans une casserole avec un filet d'huile.",
      "Couvrir de bouillon et laisser mijoter 25 min, jusqu'à ce que les légumes soient fondants.",
      "Mixer (ou laisser en morceaux), ajouter la crème, saler, poivrer.",
    ],
  },
  {
    title: "Tarte à l'oignon",
    servings: 4,
    minutes: 40,
    tags: ["végé", "four"],
    ingredients: [
      { nom: "pâte feuilletée", quantite: 1, unite: "pièce" },
      { nom: "oignon", quantite: 4, unite: "pièce" },
      { nom: "œufs", quantite: 3, unite: "pièce" },
      { nom: "crème fraîche", quantite: 20, unite: "cl" },
      { nom: "gruyère", quantite: 100, unite: "g" },
      { nom: "moutarde", quantite: 15, unite: "g" },
      { nom: "beurre", quantite: 20, unite: "g" },
    ],
    steps: [
      "Préchauffer le four à 190 °C.",
      "Émincer les oignons et les faire fondre doucement 10 min dans le beurre.",
      "Foncer le moule avec la pâte, piquer à la fourchette, étaler la moutarde sur le fond.",
      "Battre les œufs avec la crème, ajouter les oignons fondus et verser sur le fond de tarte.",
      "Parsemer de gruyère et enfourner 25 min.",
    ],
  },
  {
    title: "Riz sauté aux légumes et œuf",
    servings: 2,
    minutes: 25,
    tags: ["rapide", "anti-gaspi", "végé"],
    ingredients: [
      { nom: "riz", quantite: 250, unite: "g" },
      { nom: "œufs", quantite: 2, unite: "pièce" },
      { nom: "carottes", quantite: 2, unite: "pièce" },
      { nom: "petit pois surgelés", quantite: 150, unite: "g" },
      { nom: "poivron", quantite: 1, unite: "pièce" },
      { nom: "sauce soja", quantite: 3, unite: "cl" },
      { nom: "huile d'olive", quantite: 2, unite: "cl" },
    ],
    steps: [
      "Cuire le riz de préférence à l'avance (le riz de la veille saute encore mieux).",
      "Couper les carottes et le poivron en petits dés.",
      "Faire sauter les légumes 8 min dans un wok ou une grande poêle bien chaude.",
      "Ajouter le riz puis les œufs battus, mélanger 2 min.",
      "Hors du feu, arroser de sauce soja et servir.",
    ],
  },
  {
    title: "Papillote de saumon aux légumes",
    servings: 2,
    minutes: 30,
    tags: ["léger", "four"],
    ingredients: [
      { nom: "saumon", quantite: 300, unite: "g" },
      { nom: "courgettes", quantite: 1, unite: "pièce" },
      { nom: "carottes", quantite: 2, unite: "pièce" },
      { nom: "citron", quantite: 1, unite: "pièce" },
      { nom: "thym", quantite: 2, unite: "pièce" },
      { nom: "huile d'olive", quantite: 2, unite: "cl" },
      { nom: "sel", quantite: 1, unite: "pièce" },
      { nom: "poivre", quantite: 1, unite: "pièce" },
    ],
    steps: [
      "Préchauffer le four à 200 °C.",
      "Couper les courgettes et les carottes en fines rondelles, les déposer au centre de deux feuilles de papier sulfurisé.",
      "Poser le saumon sur les légumes, arroser d'huile d'olive, ajouter citron et thym, saler, poivrer.",
      "Fermer les papillotes et enfourner 20 min.",
      "Servir les papillotes fermées, chacun ouvre la sienne à table.",
    ],
  },
];

const admin = await db.user.findFirst({
  where: { role: "ADMIN" },
  orderBy: { createdAt: "asc" },
});
if (!admin) {
  console.error(
    "Aucun compte ADMIN trouvé — connecte-toi une première fois sur l'app (premier compte = ADMIN), puis relance le seed."
  );
  process.exit(1);
}

const existantes = await db.recipe.findMany({
  where: { createdById: admin.id },
  select: { title: true },
});
const titres = new Set(existantes.map((r) => r.title));

let ajoutees = 0;
for (const recette of RECETTES) {
  if (titres.has(recette.title)) continue;
  await db.recipe.create({ data: { ...recette, createdById: admin.id } });
  ajoutees++;
}

console.log(
  `Seed terminé : ${ajoutees} recette(s) ajoutée(s) pour ${admin.email} — ${RECETTES.length - ajoutees} déjà présente(s), ignorée(s).`
);

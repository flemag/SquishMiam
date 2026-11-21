-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "categorieId" TEXT;

-- CreateTable
CREATE TABLE "Categorie" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "masquee" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Categorie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Categorie_cle_key" ON "Categorie"("cle");

-- CreateIndex
CREATE INDEX "Recipe_categorieId_idx" ON "Recipe"("categorieId");

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "Categorie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed des catégories de départ (ids stables)
INSERT INTO "Categorie" ("id", "nom", "cle") VALUES
  ('cat-pates',   'Pâtes, riz & céréales', 'pates, riz & cereales'),
  ('cat-vege',    'Végé',                  'vege'),
  ('cat-viande',  'Viande',                'viande'),
  ('cat-poisson', 'Poisson',               'poisson'),
  ('cat-soupe',   'Soupe',                 'soupe'),
  ('cat-salade',  'Salade',                'salade'),
  ('cat-oeufs',   'Œufs & brunch',         'oeufs & brunch'),
  ('cat-dessert', 'Dessert',               'dessert'),
  ('cat-autre',   'Autre',                 'autre')
ON CONFLICT ("id") DO NOTHING;

-- Backfill : aucune recette existante ne reste sans catégorie
UPDATE "Recipe" SET "categorieId" = 'cat-autre' WHERE "categorieId" IS NULL;

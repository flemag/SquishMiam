-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "editable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isSharedCopy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceRecipeId" TEXT;

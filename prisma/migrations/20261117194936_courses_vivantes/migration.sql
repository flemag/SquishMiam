-- CreateEnum
CREATE TYPE "GroceryItemSource" AS ENUM ('PLAN', 'MANUEL');

-- AlterTable
ALTER TABLE "GroceryListItem" ADD COLUMN     "masquee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" "GroceryItemSource" NOT NULL DEFAULT 'PLAN';

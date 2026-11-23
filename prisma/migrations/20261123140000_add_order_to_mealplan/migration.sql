-- AlterTable
ALTER TABLE "MealPlanEntry" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX IF EXISTS "MealPlanEntry_ownerId_date_slot_key";

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanEntry_ownerId_date_slot_order_key"
  ON "MealPlanEntry" ("ownerId", "date", "slot", "order");
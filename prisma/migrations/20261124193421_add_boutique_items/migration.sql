-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeAccessory" TEXT,
ADD COLUMN     "activeTheme" TEXT,
ADD COLUMN     "purchasedItems" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "BoutiqueItem" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "prix" INTEGER NOT NULL DEFAULT 0,
    "image" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoutiqueItem_pkey" PRIMARY KEY ("id")
);

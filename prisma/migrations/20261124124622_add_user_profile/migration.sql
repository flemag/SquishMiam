-- AlterTable
ALTER TABLE "User" ADD COLUMN     "goal" TEXT NOT NULL DEFAULT 'equilibre',
ADD COLUMN     "householdSize" INTEGER NOT NULL DEFAULT 1;

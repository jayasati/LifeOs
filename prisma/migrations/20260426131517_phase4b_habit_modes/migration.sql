-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "customDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

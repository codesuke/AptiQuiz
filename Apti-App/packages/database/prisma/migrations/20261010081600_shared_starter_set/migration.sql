-- AlterTable
ALTER TABLE "QuestionSet" ADD COLUMN     "isStarter" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "ownerId" DROP NOT NULL;

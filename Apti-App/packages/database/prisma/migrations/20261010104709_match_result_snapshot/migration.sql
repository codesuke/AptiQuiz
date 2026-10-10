/*
  Warnings:

  - Added the required column `emailVerifiedAtCompletion` to the `MatchResult` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rank` to the `MatchResult` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "MatchResult_collegeId_completedAt_idx";

-- AlterTable
ALTER TABLE "MatchResult" ADD COLUMN     "emailVerifiedAtCompletion" BOOLEAN NOT NULL,
ADD COLUMN     "rank" INTEGER NOT NULL,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "averageResponseMs" DROP NOT NULL,
ALTER COLUMN "completedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "MatchResult_collegeId_emailVerifiedAtCompletion_completedAt_idx" ON "MatchResult"("collegeId", "emailVerifiedAtCompletion", "completedAt");

-- CreateIndex
CREATE INDEX "MatchResult_userId_completedAt_idx" ON "MatchResult"("userId", "completedAt");

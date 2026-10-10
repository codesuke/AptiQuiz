-- AlterTable
ALTER TABLE "QuestionSet" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "QuestionSet_ownerId_idempotencyKey_key" ON "QuestionSet"("ownerId", "idempotencyKey");

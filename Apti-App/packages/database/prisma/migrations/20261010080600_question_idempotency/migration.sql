-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Question_questionSetId_idempotencyKey_key" ON "Question"("questionSetId", "idempotencyKey");

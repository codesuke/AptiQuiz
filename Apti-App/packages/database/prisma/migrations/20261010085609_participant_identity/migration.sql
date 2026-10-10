/*
  Warnings:

  - A unique constraint covering the columns `[roomId,idempotencyKey]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roomId,userId]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `Participant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "idempotencyKey" TEXT NOT NULL,
ADD COLUMN     "userId" TEXT,
ALTER COLUMN "resumeTokenHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Participant_roomId_idempotencyKey_key" ON "Participant"("roomId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_roomId_userId_key" ON "Participant"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

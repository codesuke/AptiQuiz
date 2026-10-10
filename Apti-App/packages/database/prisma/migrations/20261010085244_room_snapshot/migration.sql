/*
  Warnings:

  - A unique constraint covering the columns `[hostId,idempotencyKey]` on the table `Room` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `questionSnapshot` to the `Room` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "questionSnapshot" JSONB NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Room_hostId_idempotencyKey_key" ON "Room"("hostId", "idempotencyKey");

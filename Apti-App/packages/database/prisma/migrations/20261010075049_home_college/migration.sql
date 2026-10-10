-- AlterTable
ALTER TABLE "User" ADD COLUMN     "homeCollegeId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_homeCollegeId_fkey" FOREIGN KEY ("homeCollegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

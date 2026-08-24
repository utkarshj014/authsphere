/*
  Warnings:

  - You are about to drop the column `updated_at` on the `email_verification_tokens` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `permissions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `roles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "email_verification_tokens" DROP COLUMN "updated_at";

-- AlterTable
ALTER TABLE "permissions" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "mfa_challenges" ADD COLUMN     "type" "SecurityEventType" NOT NULL DEFAULT 'LOGIN_SUCCESS';

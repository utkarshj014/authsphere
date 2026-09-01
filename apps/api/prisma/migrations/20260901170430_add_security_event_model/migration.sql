-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'MFA_ENABLED', 'MFA_DISABLED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'OAUTH_LOGIN', 'MAGIC_LINK_LOGIN');

-- CreateTable
CREATE TABLE "security_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "SecurityEventType" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "security_events_user_id_created_at_idx" ON "security_events"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

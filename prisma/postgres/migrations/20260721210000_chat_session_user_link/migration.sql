ALTER TABLE "chat_sessions" ADD COLUMN "user_id" TEXT;
CREATE INDEX "chat_sessions_user_id_idx" ON "chat_sessions"("user_id");

-- CreateEnum
CREATE TYPE "ConversationChannel" AS ENUM ('INSTAGRAM', 'WHATSAPP', 'EMAIL', 'LINKEDIN', 'OTHER');

-- CreateEnum
CREATE TYPE "ConversationDirection" AS ENUM ('SENT', 'RECEIVED');

-- CreateTable
CREATE TABLE "lead_conversations" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "channel" "ConversationChannel" NOT NULL DEFAULT 'INSTAGRAM',
    "direction" "ConversationDirection" NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_conversations_leadId_idx" ON "lead_conversations"("leadId");
CREATE INDEX "lead_conversations_channel_idx" ON "lead_conversations"("channel");
CREATE INDEX "lead_conversations_direction_idx" ON "lead_conversations"("direction");
CREATE INDEX "lead_conversations_createdAt_idx" ON "lead_conversations"("createdAt");

-- AddForeignKey
ALTER TABLE "lead_conversations" ADD CONSTRAINT "lead_conversations_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
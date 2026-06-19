-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'RESPONDED', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('HOT', 'WARM', 'COLD', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'CUSTOM');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('INSTAGRAM', 'WHATSAPP', 'LINKEDIN', 'EMAIL', 'OTHER');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('DRAFT', 'USED', 'SENT', 'RESPONDED', 'IGNORED');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'CANCELED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "FeedbackProblemType" AS ENUM ('INVENTED_INFO', 'GENERIC_MESSAGE', 'BAD_CLASSIFICATION', 'BAD_STRATEGY', 'BAD_FORMATTING', 'GOOD_RESULT', 'OTHER');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "instagram" TEXT,
    "website" TEXT,
    "niche" TEXT,
    "preferredChannel" TEXT,
    "source" TEXT DEFAULT 'manual',
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "temperature" "LeadTemperature" NOT NULL DEFAULT 'UNKNOWN',
    "score" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_analyses" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "classification" TEXT,
    "executiveSummary" TEXT,
    "commercialDiagnosis" TEXT,
    "confirmedInfo" JSONB DEFAULT '[]',
    "observations" JSONB DEFAULT '[]',
    "hypotheses" JSONB DEFAULT '[]',
    "pains" JSONB DEFAULT '[]',
    "opportunities" JSONB DEFAULT '[]',
    "strategy" TEXT,
    "closingProbability" TEXT,
    "nextAction" TEXT,
    "missingInfo" JSONB DEFAULT '[]',
    "rawInput" JSONB,
    "rawOutput" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_suggestions" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "analysisId" TEXT,
    "type" "MessageType" NOT NULL DEFAULT 'INITIAL',
    "channel" "MessageChannel" NOT NULL DEFAULT 'INSTAGRAM',
    "content" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "message_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_up_tasks" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "messageId" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "follow_up_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_feedbacks" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "analysisId" TEXT,
    "rating" INTEGER NOT NULL,
    "problemType" "FeedbackProblemType" NOT NULL DEFAULT 'OTHER',
    "comment" TEXT,
    "expectedImprovement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_instagram_key" ON "leads"("instagram");

-- AddForeignKey
ALTER TABLE "lead_analyses" ADD CONSTRAINT "lead_analyses_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_suggestions" ADD CONSTRAINT "message_suggestions_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_suggestions" ADD CONSTRAINT "message_suggestions_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "lead_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_tasks" ADD CONSTRAINT "follow_up_tasks_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "message_suggestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedbacks" ADD CONSTRAINT "agent_feedbacks_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_feedbacks" ADD CONSTRAINT "agent_feedbacks_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "lead_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

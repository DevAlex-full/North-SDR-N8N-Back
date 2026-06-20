-- CreateEnum
CREATE TYPE "LossReason" AS ENUM ('SEM_VERBA', 'SEM_INTERESSE', 'JA_POSSUI_SISTEMA', 'SEM_RESPOSTA', 'ADIADO', 'OUTRO');

-- CreateTable
CREATE TABLE "lead_outcomes" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "lossReason" "LossReason",
    "valorProposta" DECIMAL(12,2),
    "valorFechado" DECIMAL(12,2),
    "canalContato" "MessageChannel",
    "dataPrimeiroContato" TIMESTAMP(3),
    "dataResposta" TIMESTAMP(3),
    "dataReuniao" TIMESTAMP(3),
    "dataProposta" TIMESTAMP(3),
    "dataFechamento" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_outcomes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "lead_outcomes_leadId_key" ON "lead_outcomes"("leadId");
CREATE INDEX "lead_outcomes_status_idx" ON "lead_outcomes"("status");
CREATE INDEX "lead_outcomes_lossReason_idx" ON "lead_outcomes"("lossReason");
CREATE INDEX "lead_outcomes_canalContato_idx" ON "lead_outcomes"("canalContato");
CREATE INDEX "lead_outcomes_dataFechamento_idx" ON "lead_outcomes"("dataFechamento");

-- AddForeignKey
ALTER TABLE "lead_outcomes" ADD CONSTRAINT "lead_outcomes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Trigger updatedAt (mesmo padrão das outras tabelas)
CREATE TRIGGER lead_outcomes_updated_at BEFORE UPDATE ON "lead_outcomes"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
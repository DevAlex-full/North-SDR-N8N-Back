import { z } from 'zod'

// Aceita string, array de strings ou undefined — flexível para o n8n
const flexArray = z.union([
  z.array(z.string()),
  z.string(),
]).optional().default([])

export const n8nLeadAnalysisSchema = z.object({
  // Lead
  companyName:      z.string().min(1, 'companyName é obrigatório'),
  instagram:        z.string().optional(),
  website:          z.string().optional(),
  niche:            z.string().optional(),
  preferredChannel: z.string().optional(),
  source:           z.string().optional().default('n8n'),
  notes:            z.string().optional(),

  // Análise
  classification:      z.string().optional(),
  executiveSummary:    z.string().optional(),
  commercialDiagnosis: z.string().optional(),
  confirmedInfo:       flexArray,
  observations:        flexArray,
  hypotheses:          flexArray,
  pains:               flexArray,
  opportunities:       flexArray,
  strategy:            z.string().optional(),
  closingProbability:  z.string().optional(),
  nextAction:          z.string().optional(),
  missingInfo:         flexArray,

  // Mensagens
  initialMessage: z.string().optional(),
  followUp1:      z.string().optional(),
  followUp2:      z.string().optional(),

  // Raw
  rawInput:  z.record(z.unknown()).optional(),
  rawOutput: z.string().optional(),
})

export type N8nLeadAnalysisInput = z.infer<typeof n8nLeadAnalysisSchema>

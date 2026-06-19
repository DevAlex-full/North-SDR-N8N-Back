import { z } from 'zod'

export const createAnalysisSchema = z.object({
  leadId:              z.string().cuid(),
  classification:      z.string().max(100).optional(),
  executiveSummary:    z.string().optional(),
  commercialDiagnosis: z.string().optional(),
  confirmedInfo:       z.array(z.string()).optional().default([]),
  observations:        z.array(z.string()).optional().default([]),
  hypotheses:          z.array(z.string()).optional().default([]),
  pains:               z.array(z.string()).optional().default([]),
  opportunities:       z.array(z.string()).optional().default([]),
  strategy:            z.string().optional(),
  closingProbability:  z.string().max(100).optional(),
  nextAction:          z.string().optional(),
  missingInfo:         z.array(z.string()).optional().default([]),
  rawInput:            z.record(z.unknown()).optional(),
  rawOutput:           z.string().optional(),
})

export const idParamSchema     = z.object({ id:     z.string().cuid() })
export const leadIdParamSchema = z.object({ leadId: z.string().cuid() })

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>

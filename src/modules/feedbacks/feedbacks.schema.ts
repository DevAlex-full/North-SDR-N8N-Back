import { z } from 'zod'

export const createFeedbackSchema = z.object({
  leadId:              z.string().cuid(),
  analysisId:          z.string().cuid().optional(),
  rating:              z.number().int().min(1).max(5),
  problemType:         z.enum(['INVENTED_INFO', 'GENERIC_MESSAGE', 'BAD_CLASSIFICATION', 'BAD_STRATEGY', 'BAD_FORMATTING', 'GOOD_RESULT', 'OTHER']).default('OTHER'),
  comment:             z.string().optional(),
  expectedImprovement: z.string().optional(),
})

export const leadIdParamSchema = z.object({ leadId: z.string().cuid() })

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>

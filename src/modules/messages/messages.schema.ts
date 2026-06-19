import { z } from 'zod'

export const createMessageSchema = z.object({
  leadId:     z.string().cuid(),
  analysisId: z.string().cuid().optional(),
  type:       z.enum(['INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'CUSTOM']).default('INITIAL'),
  channel:    z.enum(['INSTAGRAM', 'WHATSAPP', 'LINKEDIN', 'EMAIL', 'OTHER']).default('INSTAGRAM'),
  content:    z.string().min(1),
  status:     z.enum(['DRAFT', 'USED', 'SENT', 'RESPONDED', 'IGNORED']).optional().default('DRAFT'),
})

export const updateMessageSchema = z.object({
  type:    z.enum(['INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'CUSTOM']).optional(),
  channel: z.enum(['INSTAGRAM', 'WHATSAPP', 'LINKEDIN', 'EMAIL', 'OTHER']).optional(),
  content: z.string().min(1).optional(),
  status:  z.enum(['DRAFT', 'USED', 'SENT', 'RESPONDED', 'IGNORED']).optional(),
})

export const idParamSchema     = z.object({ id:     z.string().cuid() })
export const leadIdParamSchema = z.object({ leadId: z.string().cuid() })

export type CreateMessageInput = z.infer<typeof createMessageSchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>

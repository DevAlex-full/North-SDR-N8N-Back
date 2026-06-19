import { z } from 'zod'

export const createFollowUpSchema = z.object({
  leadId:    z.string().cuid(),
  messageId: z.string().cuid().optional(),
  dueDate:   z.coerce.date(),
  status:    z.enum(['PENDING', 'DONE', 'CANCELED', 'OVERDUE']).optional().default('PENDING'),
  notes:     z.string().optional(),
})

export const updateFollowUpSchema = z.object({
  dueDate: z.coerce.date().optional(),
  status:  z.enum(['PENDING', 'DONE', 'CANCELED', 'OVERDUE']).optional(),
  notes:   z.string().optional(),
})

export const idParamSchema = z.object({ id: z.string().cuid() })

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>

import { z } from 'zod'

export const ConversationChannelEnum = z.enum(['INSTAGRAM', 'WHATSAPP', 'EMAIL', 'LINKEDIN', 'OTHER'])
export const ConversationDirectionEnum = z.enum(['SENT', 'RECEIVED'])

export const createConversationSchema = z.object({
  channel:   ConversationChannelEnum.optional().default('INSTAGRAM'),
  direction: ConversationDirectionEnum,
  content:   z.string().min(1, 'content é obrigatório'),
  metadata:  z.record(z.unknown()).optional(),
})

export const leadIdParamSchema = z.object({ leadId: z.string().cuid() })

export type CreateConversationInput = z.infer<typeof createConversationSchema>
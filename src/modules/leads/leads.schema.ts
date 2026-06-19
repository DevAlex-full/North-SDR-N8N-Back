import { z } from 'zod'

export const LeadStatusEnum = z.enum([
  'NEW', 'CONTACTED', 'RESPONDED', 'FOLLOW_UP_1', 'FOLLOW_UP_2',
  'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST', 'ARCHIVED',
])

export const LeadTemperatureEnum = z.enum(['HOT', 'WARM', 'COLD', 'UNKNOWN'])

export const createLeadSchema = z.object({
  companyName:      z.string().min(1).max(255),
  instagram:        z.string().max(100).optional(),
  website:          z.string().url('URL inválida').optional().or(z.literal('')),
  niche:            z.string().max(255).optional(),
  preferredChannel: z.string().max(100).optional(),
  source:           z.string().max(100).optional().default('manual'),
  notes:            z.string().optional(),
  status:           LeadStatusEnum.optional().default('NEW'),
  temperature:      LeadTemperatureEnum.optional().default('UNKNOWN'),
  score:            z.number().int().min(0).max(100).optional().default(0),
})

export const updateLeadSchema = createLeadSchema.partial()

export const idParamSchema = z.object({ id: z.string().cuid() })
export const leadIdParamSchema = z.object({ leadId: z.string().cuid() })

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>

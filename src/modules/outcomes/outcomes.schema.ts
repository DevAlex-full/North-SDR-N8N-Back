import { z } from 'zod'

export const LeadStatusEnum = z.enum([
  'NEW', 'CONTACTED', 'RESPONDED', 'FOLLOW_UP_1', 'FOLLOW_UP_2',
  'MEETING_SCHEDULED', 'PROPOSAL_SENT', 'WON', 'LOST', 'ARCHIVED',
])

export const LossReasonEnum = z.enum([
  'SEM_VERBA', 'SEM_INTERESSE', 'JA_POSSUI_SISTEMA', 'SEM_RESPOSTA', 'ADIADO', 'OUTRO',
])

export const MessageChannelEnum = z.enum(['INSTAGRAM', 'WHATSAPP', 'LINKEDIN', 'EMAIL', 'OTHER'])

// ── Upsert genérico de outcome (cria se não existir, atualiza campos enviados) ──
export const upsertOutcomeSchema = z.object({
  status:              LeadStatusEnum.optional(),
  lossReason:          LossReasonEnum.optional(),
  valorProposta:       z.number().nonnegative().optional(),
  valorFechado:        z.number().nonnegative().optional(),
  canalContato:        MessageChannelEnum.optional(),
  dataPrimeiroContato: z.coerce.date().optional(),
  dataResposta:        z.coerce.date().optional(),
  dataReuniao:         z.coerce.date().optional(),
  dataProposta:        z.coerce.date().optional(),
  dataFechamento:      z.coerce.date().optional(),
  observacoes:         z.string().optional(),
})

// ── Ações de atalho — cada uma seta o status correto + datas/valores relevantes ──
export const registerMeetingSchema = z.object({
  dataReuniao:  z.coerce.date().optional().default(() => new Date()),
  canalContato: MessageChannelEnum.optional(),
  observacoes:  z.string().optional(),
})

export const registerProposalSchema = z.object({
  valorProposta: z.number().nonnegative('valorProposta deve ser >= 0'),
  dataProposta:  z.coerce.date().optional().default(() => new Date()),
  observacoes:   z.string().optional(),
})

export const registerWonSchema = z.object({
  valorFechado:   z.number().nonnegative('valorFechado deve ser >= 0'),
  dataFechamento: z.coerce.date().optional().default(() => new Date()),
  observacoes:    z.string().optional(),
})

export const registerLostSchema = z.object({
  lossReason:     LossReasonEnum,
  dataFechamento: z.coerce.date().optional().default(() => new Date()),
  observacoes:    z.string().optional(),
})

export const leadIdParamSchema = z.object({ leadId: z.string().cuid() })

export type UpsertOutcomeInput   = z.infer<typeof upsertOutcomeSchema>
export type RegisterMeetingInput = z.infer<typeof registerMeetingSchema>
export type RegisterProposalInput = z.infer<typeof registerProposalSchema>
export type RegisterWonInput     = z.infer<typeof registerWonSchema>
export type RegisterLostInput    = z.infer<typeof registerLostSchema>
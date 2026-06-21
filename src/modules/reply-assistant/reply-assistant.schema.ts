import { z } from 'zod'

export const ConversationChannelEnum = z.enum(['INSTAGRAM', 'WHATSAPP', 'EMAIL', 'LINKEDIN', 'OTHER'])

/**
 * Payload recebido do operador/north-back quando o lead responde algo.
 * O backend NÃO gera a resposta aqui — apenas monta contexto, persiste a
 * mensagem recebida e dispara para o n8n (se configurado).
 */
export const requestReplySchema = z.object({
  message: z.string().min(1, 'message é obrigatório'),
  channel: ConversationChannelEnum.optional(),
})

/**
 * Payload recebido de volta do n8n (callback) após o Gemini gerar a sugestão.
 * Espelha exatamente o que a tarefa pede como saída do reply-assistant:
 * análise de intenção, objeções, estágio, resposta sugerida e próximos passos.
 */
export const replyAssistantCallbackSchema = z.object({
  intentAnalysis:      z.string().optional(),
  objections:           z.union([z.array(z.string()), z.string()]).optional().default([]),
  leadStage:            z.string().optional(),
  suggestedReply:       z.string().min(1, 'suggestedReply é obrigatório'),
  recommendedNextSteps: z.union([z.array(z.string()), z.string()]).optional().default([]),
  rawOutput:            z.string().optional(),
})

export const leadIdParamSchema = z.object({ leadId: z.string().cuid() })

export type RequestReplyInput            = z.infer<typeof requestReplySchema>
export type ReplyAssistantCallbackInput  = z.infer<typeof replyAssistantCallbackSchema>
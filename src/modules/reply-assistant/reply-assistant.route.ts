import { FastifyInstance } from 'fastify'
import { replyAssistantService } from './reply-assistant.service'
import { requestReplySchema, replyAssistantCallbackSchema, leadIdParamSchema } from './reply-assistant.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'
import { env } from '../../config/env'

export async function replyAssistantRoutes(app: FastifyInstance): Promise<void> {
  // POST /leads/:leadId/reply-assistant
  // Recebe a resposta do lead, monta contexto completo, persiste a mensagem
  // recebida e dispara para o n8n (se N8N_REPLY_ASSISTANT_WEBHOOK_URL estiver
  // configurada). O backend NUNCA chama Gemini diretamente — o n8n continua
  // sendo o único responsável por gerar a sugestão de resposta.
  app.post<{ Params: { leadId: string } }>('/leads/:leadId/reply-assistant', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = requestReplySchema.parse(request.body)
      const result = await replyAssistantService.requestReply(leadId, body)

      if (!env.N8N_REPLY_ASSISTANT_WEBHOOK_URL) {
        app.log.warn(
          { leadId },
          '⚠️ N8N_REPLY_ASSISTANT_WEBHOOK_URL não configurada — contexto montado e mensagem salva, mas nenhuma chamada foi disparada ao n8n',
        )
      } else if (!result.dispatchedToN8n) {
        app.log.error({ leadId }, '❌ Falha ao notificar o n8n — contexto persistido para reprocessamento manual')
      }

      return reply.status(202).send(
        success(
          result.context,
          result.dispatchedToN8n
            ? 'Mensagem recebida e contexto enviado ao n8n para gerar sugestão'
            : 'Mensagem recebida e contexto montado, mas não foi possível notificar o n8n (ver logs)',
          { dispatchedToN8n: result.dispatchedToN8n },
        ),
      )
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao processar resposta do lead'))
    }
  })

  // POST /leads/:leadId/reply-assistant/callback
  // Endpoint chamado PELO N8N (não pelo north-back) após o Gemini gerar a
  // sugestão de resposta. Protegido pela mesma x-api-key das demais rotas.
  app.post<{ Params: { leadId: string } }>('/leads/:leadId/reply-assistant/callback', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = replyAssistantCallbackSchema.parse(request.body)
      const conversation = await replyAssistantService.saveSuggestion(leadId, body)
      return reply.status(201).send(success(conversation, 'Sugestão de resposta salva com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao salvar sugestão de resposta'))
    }
  })

  // GET /leads/:leadId/reply-assistant/conversation
  // Histórico completo de conversa (enviado + recebido + sugestões),
  // pronto para o North exibir sem necessidade de nova consulta/migration.
  app.get<{ Params: { leadId: string } }>('/leads/:leadId/reply-assistant/conversation', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const conversation = await replyAssistantService.getFullConversation(leadId)
      return reply.send(success(conversation, undefined, { total: conversation.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar conversa completa do lead'))
    }
  })
}
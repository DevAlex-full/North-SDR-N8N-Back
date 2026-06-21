import { FastifyInstance } from 'fastify'
import { conversationsService } from './conversations.service'
import { createConversationSchema, leadIdParamSchema } from './conversations.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function conversationsRoutes(app: FastifyInstance): Promise<void> {
  // POST /leads/:leadId/conversations — registra mensagem enviada ou recebida
  app.post<{ Params: { leadId: string } }>('/leads/:leadId/conversations', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = createConversationSchema.parse(request.body)
      const conversation = await conversationsService.create(leadId, body)
      return reply.status(201).send(success(conversation, 'Conversa registrada com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao registrar conversa'))
    }
  })

  // GET /leads/:leadId/conversations — histórico de conversa de um lead (ordem cronológica)
  app.get<{ Params: { leadId: string } }>('/leads/:leadId/conversations', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const conversations = await conversationsService.findByLeadId(leadId)
      return reply.send(success(conversations, undefined, { total: conversations.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar conversas do lead'))
    }
  })

  // GET /conversations — lista geral de conversas (mais recentes primeiro)
  app.get('/conversations', async (_req, reply) => {
    try {
      const conversations = await conversationsService.findAll()
      return reply.send(success(conversations, undefined, { total: conversations.length }))
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send(error('Erro ao listar conversas'))
    }
  })
}
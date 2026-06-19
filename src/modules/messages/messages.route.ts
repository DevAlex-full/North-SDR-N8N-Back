import { FastifyInstance } from 'fastify'
import { messagesService } from './messages.service'
import { createMessageSchema, updateMessageSchema, idParamSchema, leadIdParamSchema } from './messages.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function messagesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/messages', async (request, reply) => {
    try {
      const body = createMessageSchema.parse(request.body)
      const msg = await messagesService.create(body)
      return reply.status(201).send(success(msg, 'Mensagem criada com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao criar mensagem'))
    }
  })

  app.get('/messages', async (_req, reply) => {
    try {
      const msgs = await messagesService.findAll()
      return reply.send(success(msgs, undefined, { total: msgs.length }))
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send(error('Erro ao listar mensagens'))
    }
  })

  app.get<{ Params: { leadId: string } }>('/leads/:leadId/messages', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const msgs = await messagesService.findByLeadId(leadId)
      return reply.send(success(msgs, undefined, { total: msgs.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar mensagens do lead'))
    }
  })

  app.patch<{ Params: { id: string } }>('/messages/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params)
      const body = updateMessageSchema.parse(request.body)
      const msg = await messagesService.update(id, body)
      return reply.send(success(msg, 'Mensagem atualizada com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao atualizar mensagem'))
    }
  })
}

import { FastifyInstance } from 'fastify'
import { followUpsService } from './followups.service'
import { createFollowUpSchema, updateFollowUpSchema, idParamSchema } from './followups.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function followUpsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/followups', async (request, reply) => {
    try {
      const body = createFollowUpSchema.parse(request.body)
      const fu = await followUpsService.create(body)
      return reply.status(201).send(success(fu, 'Follow-up criado com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao criar follow-up'))
    }
  })

  app.get('/followups', async (_req, reply) => {
    try {
      const fus = await followUpsService.findAll()
      return reply.send(success(fus, undefined, { total: fus.length }))
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send(error('Erro ao listar follow-ups'))
    }
  })

  // Rota estática /today ANTES de /:id para evitar conflito de param
  app.get('/followups/today', async (_req, reply) => {
    try {
      const fus = await followUpsService.findToday()
      return reply.send(success(fus, `${fus.length} follow-up(s) para hoje`, { total: fus.length }))
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar follow-ups de hoje'))
    }
  })

  app.patch<{ Params: { id: string } }>('/followups/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params)
      const body = updateFollowUpSchema.parse(request.body)
      const fu = await followUpsService.update(id, body)
      return reply.send(success(fu, 'Follow-up atualizado com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao atualizar follow-up'))
    }
  })
}

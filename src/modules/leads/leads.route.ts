import { FastifyInstance } from 'fastify'
import { leadsService } from './leads.service'
import { createLeadSchema, updateLeadSchema, idParamSchema } from './leads.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function leadsRoutes(app: FastifyInstance): Promise<void> {
  app.post('/leads', async (request, reply) => {
    try {
      const body = createLeadSchema.parse(request.body)
      const lead = await leadsService.create(body)
      return reply.status(201).send(success(lead, 'Lead criado com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao criar lead'))
    }
  })

  app.get('/leads', async (_req, reply) => {
    try {
      const leads = await leadsService.findAll()
      return reply.send(success(leads, undefined, { total: leads.length }))
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send(error('Erro ao listar leads'))
    }
  })

  app.get<{ Params: { id: string } }>('/leads/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params)
      const lead = await leadsService.findById(id)
      return reply.send(success(lead))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar lead'))
    }
  })

  app.patch<{ Params: { id: string } }>('/leads/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params)
      const body = updateLeadSchema.parse(request.body)
      const lead = await leadsService.update(id, body)
      return reply.send(success(lead, 'Lead atualizado com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao atualizar lead'))
    }
  })

  app.delete<{ Params: { id: string } }>('/leads/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params)
      await leadsService.remove(id)
      return reply.send(success(null, 'Lead removido com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao remover lead'))
    }
  })
}

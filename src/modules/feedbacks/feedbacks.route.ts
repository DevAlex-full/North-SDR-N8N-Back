import { FastifyInstance } from 'fastify'
import { feedbacksService } from './feedbacks.service'
import { createFeedbackSchema, leadIdParamSchema } from './feedbacks.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function feedbacksRoutes(app: FastifyInstance): Promise<void> {
  app.post('/feedbacks', async (request, reply) => {
    try {
      const body = createFeedbackSchema.parse(request.body)
      const fb = await feedbacksService.create(body)
      return reply.status(201).send(success(fb, 'Feedback registrado com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao registrar feedback'))
    }
  })

  app.get('/feedbacks', async (_req, reply) => {
    try {
      const fbs = await feedbacksService.findAll()
      return reply.send(success(fbs, undefined, { total: fbs.length }))
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send(error('Erro ao listar feedbacks'))
    }
  })

  app.get<{ Params: { leadId: string } }>('/leads/:leadId/feedbacks', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const fbs = await feedbacksService.findByLeadId(leadId)
      return reply.send(success(fbs, undefined, { total: fbs.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar feedbacks do lead'))
    }
  })
}

import { FastifyInstance } from 'fastify'
import { analysesService } from './analyses.service'
import { createAnalysisSchema, idParamSchema, leadIdParamSchema } from './analyses.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function analysesRoutes(app: FastifyInstance): Promise<void> {
  app.post('/analyses', async (request, reply) => {
    try {
      const body = createAnalysisSchema.parse(request.body)
      const analysis = await analysesService.create(body)
      return reply.status(201).send(success(analysis, 'Análise criada com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao criar análise'))
    }
  })

  app.get('/analyses', async (_req, reply) => {
    try {
      const analyses = await analysesService.findAll()
      return reply.send(success(analyses, undefined, { total: analyses.length }))
    } catch (err) {
      app.log.error(err)
      return reply.status(500).send(error('Erro ao listar análises'))
    }
  })

  app.get<{ Params: { id: string } }>('/analyses/:id', async (request, reply) => {
    try {
      const { id } = idParamSchema.parse(request.params)
      const analysis = await analysesService.findById(id)
      return reply.send(success(analysis))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar análise'))
    }
  })

  app.get<{ Params: { leadId: string } }>('/leads/:leadId/analyses', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const analyses = await analysesService.findByLeadId(leadId)
      return reply.send(success(analyses, undefined, { total: analyses.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar análises do lead'))
    }
  })
}

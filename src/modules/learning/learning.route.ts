import { FastifyInstance } from 'fastify'
import { learningService } from './learning.service'
import { learningQuerySchema } from './learning.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function learningRoutes(app: FastifyInstance): Promise<void> {
  // GET /learning/summary
  app.get('/learning/summary', async (request, reply) => {
    try {
      const query = learningQuerySchema.parse(request.query)
      const summary = await learningService.getSummary(query)
      return reply.send(success(summary))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao gerar resumo de aprendizado'))
    }
  })

  // GET /learning/metrics
  app.get('/learning/metrics', async (request, reply) => {
    try {
      const query = learningQuerySchema.parse(request.query)
      const metrics = await learningService.getMetrics(query)
      return reply.send(success(metrics))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao calcular métricas'))
    }
  })

  // GET /learning/rankings
  app.get('/learning/rankings', async (request, reply) => {
    try {
      const query = learningQuerySchema.parse(request.query)
      const rankings = await learningService.getRankings(query)
      return reply.send(success(rankings))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao calcular rankings'))
    }
  })

  // GET /learning/niches
  app.get('/learning/niches', async (request, reply) => {
    try {
      const query = learningQuerySchema.parse(request.query)
      const niches = await learningService.getNiches(query)
      return reply.send(success(niches, undefined, { total: niches.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar dados por nicho'))
    }
  })

  // GET /learning/channels
  app.get('/learning/channels', async (request, reply) => {
    try {
      const query = learningQuerySchema.parse(request.query)
      const channels = await learningService.getChannels(query)
      return reply.send(success(channels, undefined, { total: channels.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar dados por canal'))
    }
  })

  // GET /learning/loss-reasons
  app.get('/learning/loss-reasons', async (request, reply) => {
    try {
      const query = learningQuerySchema.parse(request.query)
      const reasons = await learningService.getLossReasons(query)
      return reply.send(success(reasons, undefined, { total: reasons.length }))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar motivos de perda'))
    }
  })
}
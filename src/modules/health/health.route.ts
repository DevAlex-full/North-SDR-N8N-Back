import { FastifyInstance } from 'fastify'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { success, error } from '../../utils/response'

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // GET /health — público, sem autenticação
  app.get('/health', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return reply.status(200).send(
        success({
          status: 'ok',
          environment: env.NODE_ENV,
          timestamp: new Date().toISOString(),
          database: 'connected',
          version: '1.0.0',
        }),
      )
    } catch (err) {
      app.log.error(err, 'Health check falhou')
      return reply.status(503).send(
        error('Serviço indisponível — falha na conexão com o banco.', 'DATABASE_ERROR'),
      )
    }
  })
}

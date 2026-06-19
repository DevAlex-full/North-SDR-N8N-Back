import { FastifyInstance } from 'fastify'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyRateLimit from '@fastify/rate-limit'
import { env } from '../config/env'

export async function registerPlugins(app: FastifyInstance): Promise<void> {
  await app.register(fastifyCors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map(s => s.trim()),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })

  await app.register(fastifyHelmet, { contentSecurityPolicy: false })

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      success: false,
      message: 'Muitas requisições. Tente novamente em 1 minuto.',
      error: 'RATE_LIMIT_EXCEEDED',
    }),
  })
}

import Fastify, { FastifyInstance } from 'fastify'
import { env } from './config/env'
import { registerPlugins } from './plugins'
import { apiKeyMiddleware } from './middlewares/apiKey'
import { healthRoutes } from './modules/health/health.route'
import { leadsRoutes } from './modules/leads/leads.route'
import { analysesRoutes } from './modules/analyses/analyses.route'
import { messagesRoutes } from './modules/messages/messages.route'
import { followUpsRoutes } from './modules/followups/followups.route'
import { feedbacksRoutes } from './modules/feedbacks/feedbacks.route'
import { webhooksRoutes } from './modules/webhooks/webhooks.route'
import { outcomesRoutes } from './modules/outcomes/outcomes.route'
import { learningRoutes } from './modules/learning/learning.route'
import { error } from './utils/response'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? {
            transport: {
              target:  'pino-pretty',
              options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname', colorize: true },
            },
          }
        : true,
  })

  // ── Plugins globais ────────────────────────────────────────────────────────
  await registerPlugins(app)

  // ── Rota pública — sem autenticação ───────────────────────────────────────
  await app.register(healthRoutes)

  // ── Rotas protegidas por API Key ──────────────────────────────────────────
  // addHook aplica apiKeyMiddleware em TODAS as rotas registradas neste escopo.
  // Cobre: leads, analyses, messages, followups, feedbacks e webhooks.
  await app.register(async (secured) => {
    secured.addHook('preHandler', apiKeyMiddleware)

    await secured.register(leadsRoutes)
    await secured.register(analysesRoutes)
    await secured.register(messagesRoutes)
    await secured.register(followUpsRoutes)
    await secured.register(feedbacksRoutes)
    await secured.register(webhooksRoutes)
    await secured.register(outcomesRoutes)
    await secured.register(learningRoutes)
  })

  // ── 404 ───────────────────────────────────────────────────────────────────
  app.setNotFoundHandler((_req, reply) => {
    void reply.status(404).send(error('Rota não encontrada', 'NOT_FOUND'))
  })

  // ── Handler global de erros ───────────────────────────────────────────────
  app.setErrorHandler((err, _req, reply) => {
    app.log.error({ err }, 'Erro não tratado')

    if (err.name === 'ZodError') {
      return reply.status(422).send({
        success: false,
        message: 'Dados inválidos',
        error:   'VALIDATION_ERROR',
        details: JSON.parse(err.message),
      })
    }

    // Prisma: unique constraint
    if (err.code === 'P2002') {
      return reply.status(409).send(error('Registro duplicado.', 'CONFLICT'))
    }

    // Prisma: record not found
    if (err.code === 'P2025') {
      return reply.status(404).send(error('Registro não encontrado', 'NOT_FOUND'))
    }

    const status = (err as { statusCode?: number }).statusCode ?? 500
    return reply.status(status).send(error(err.message ?? 'Erro interno do servidor', 'INTERNAL_ERROR'))
  })

  return app
}
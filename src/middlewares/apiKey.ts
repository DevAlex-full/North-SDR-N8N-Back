import { FastifyRequest, FastifyReply } from 'fastify'
import { env } from '../config/env'

/**
 * Middleware de autenticação por API Key.
 * Aplicado globalmente em todas as rotas exceto GET /health.
 * Valida o header x-api-key contra N8N_WEBHOOK_API_KEY.
 */
export async function apiKeyMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const provided = request.headers['x-api-key']

  if (!provided || provided !== env.N8N_WEBHOOK_API_KEY) {
    request.log.warn({ method: request.method, url: request.url }, '🔒 Acesso negado — API Key inválida ou ausente')
    void reply.status(401).send({
      success: false,
      message: 'API Key inválida ou ausente. Envie o header x-api-key.',
      error: 'UNAUTHORIZED',
    })
  }
}

import { FastifyInstance } from 'fastify'
import { webhooksService } from './webhooks.service'
import { n8nLeadAnalysisSchema } from './webhooks.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

// Autenticação por API Key aplicada globalmente via addHook no app.ts
// Esta rota já está protegida pelo contexto de rotas protegidas.

export async function webhooksRoutes(app: FastifyInstance): Promise<void> {
  app.post('/webhooks/n8n/lead-analysis', async (request, reply) => {
    try {
      // Log seguro: identifica a requisição sem expor payload completo
      app.log.info({ method: request.method, url: request.url }, '📥 Webhook n8n recebido')

      const body = n8nLeadAnalysisSchema.parse(request.body)

      // Log mínimo: apenas identificadores, nunca conteúdo de mensagens
      app.log.info(
        { company: body.companyName, instagram: body.instagram ?? 'N/A' },
        '🔍 Processando lead via webhook',
      )

      const result = await webhooksService.processN8nLeadAnalysis(body)

      app.log.info(
        {
          leadId:     result.lead.id,
          analysisId: result.analysis.id,
          messages:   result.messages.length,
          followups:  result.followups.length,
        },
        '✅ Lead processado com sucesso',
      )

      return reply.status(201).send(
        success(
          {
            leadId:         result.lead.id,
            analysisId:     result.analysis.id,
            messagesCount:  result.messages.length,
            followupsCount: result.followups.length,
            lead:           result.lead,
            analysis:       result.analysis,
            messages:       result.messages,
            followups:      result.followups,
          },
          `Lead "${result.lead.companyName}" processado com sucesso`,
        ),
      )
    } catch (err) {
      if (err instanceof AppError) {
        return reply.status(err.statusCode).send(error(err.message, err.code))
      }
      app.log.error({ err }, '❌ Erro ao processar webhook n8n')
      return reply.status(500).send(error('Erro interno ao processar análise do n8n'))
    }
  })
}

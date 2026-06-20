import { FastifyInstance } from 'fastify'
import { outcomesService } from './outcomes.service'
import {
  upsertOutcomeSchema,
  registerMeetingSchema,
  registerProposalSchema,
  registerWonSchema,
  registerLostSchema,
  leadIdParamSchema,
} from './outcomes.schema'
import { success, error } from '../../utils/response'
import { AppError } from '../../utils/errors'

export async function outcomesRoutes(app: FastifyInstance): Promise<void> {
  // GET /leads/:leadId/outcome — consulta o histórico/estado comercial do lead
  app.get<{ Params: { leadId: string } }>('/leads/:leadId/outcome', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const outcome = await outcomesService.getByLeadId(leadId)
      return reply.send(success(outcome))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(500).send(error('Erro ao buscar outcome do lead'))
    }
  })

  // PATCH /leads/:leadId/outcome — upsert genérico de qualquer combinação de campos
  app.patch<{ Params: { leadId: string } }>('/leads/:leadId/outcome', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = upsertOutcomeSchema.parse(request.body)
      const outcome = await outcomesService.upsert(leadId, body)
      return reply.send(success(outcome, 'Outcome atualizado com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao atualizar outcome'))
    }
  })

  // POST /leads/:leadId/outcome/meeting — registra reunião agendada
  app.post<{ Params: { leadId: string } }>('/leads/:leadId/outcome/meeting', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = registerMeetingSchema.parse(request.body ?? {})
      const outcome = await outcomesService.registerMeeting(leadId, body)
      return reply.status(201).send(success(outcome, 'Reunião registrada com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao registrar reunião'))
    }
  })

  // POST /leads/:leadId/outcome/proposal — registra proposta enviada
  app.post<{ Params: { leadId: string } }>('/leads/:leadId/outcome/proposal', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = registerProposalSchema.parse(request.body)
      const outcome = await outcomesService.registerProposal(leadId, body)
      return reply.status(201).send(success(outcome, 'Proposta registrada com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao registrar proposta'))
    }
  })

  // POST /leads/:leadId/outcome/won — registra fechamento (ganho)
  app.post<{ Params: { leadId: string } }>('/leads/:leadId/outcome/won', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = registerWonSchema.parse(request.body)
      const outcome = await outcomesService.registerWon(leadId, body)
      return reply.status(201).send(success(outcome, 'Fechamento registrado com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao registrar fechamento'))
    }
  })

  // POST /leads/:leadId/outcome/lost — registra perda
  app.post<{ Params: { leadId: string } }>('/leads/:leadId/outcome/lost', async (request, reply) => {
    try {
      const { leadId } = leadIdParamSchema.parse(request.params)
      const body = registerLostSchema.parse(request.body)
      const outcome = await outcomesService.registerLost(leadId, body)
      return reply.status(201).send(success(outcome, 'Perda registrada com sucesso'))
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send(error(err.message, err.code))
      app.log.error(err)
      return reply.status(400).send(error('Erro ao registrar perda'))
    }
  })
}
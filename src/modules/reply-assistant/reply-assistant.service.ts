import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { env } from '../../config/env'
import { NotFoundError } from '../../utils/errors'
import { RequestReplyInput, ReplyAssistantCallbackInput } from './reply-assistant.schema'

/**
 * Contexto completo montado para o n8n decidir a próxima resposta.
 * Cobre exatamente os 7 itens pedidos na tarefa: histórico, análise
 * original, classificação, nicho, mensagens anteriores, conversations,
 * e a mensagem nova do lead que disparou o fluxo.
 */
interface ReplyAssistantContext {
  lead: {
    id: string
    companyName: string
    instagram: string | null
    niche: string | null
    status: string
    temperature: string
  }
  latestAnalysis: {
    id: string
    classification: string | null
    executiveSummary: string | null
    strategy: string | null
    nextAction: string | null
    closingProbability: string | null
  } | null
  previousMessages: {
    type: string
    channel: string
    content: string
    status: string
  }[]
  conversationHistory: {
    direction: string
    channel: string
    content: string
    createdAt: Date
  }[]
  incomingMessage: {
    content: string
    channel: string
  }
}

export class ReplyAssistantService {
  /**
   * 1-7: busca histórico, análise, classificação, nicho, mensagens
   * anteriores e conversations; monta o contexto; persiste a mensagem
   * recebida; dispara para o n8n se a URL estiver configurada.
   */
  async requestReply(leadId: string, data: RequestReplyInput): Promise<{
    context: ReplyAssistantContext
    dispatchedToN8n: boolean
  }> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')

    const channel = data.channel ?? 'INSTAGRAM'

    // ── Monta contexto: análise mais recente ─────────────────────────────────
    const latestAnalysis = await prisma.leadAnalysis.findFirst({
      where:   { leadId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, classification: true, executiveSummary: true,
        strategy: true, nextAction: true, closingProbability: true,
      },
    })

    // ── Mensagens sugeridas anteriores (rascunhos gerados pela análise) ──────
    const previousMessages = await prisma.messageSuggestion.findMany({
      where:   { leadId },
      orderBy: { createdAt: 'asc' },
      select:  { type: true, channel: true, content: true, status: true },
    })

    // ── Histórico real de conversa (enviado/recebido) ─────────────────────────
    const conversationHistory = await prisma.leadConversation.findMany({
      where:   { leadId },
      orderBy: { createdAt: 'asc' },
      select:  { direction: true, channel: true, content: true, createdAt: true },
    })

    const context: ReplyAssistantContext = {
      lead: {
        id: lead.id,
        companyName: lead.companyName,
        instagram: lead.instagram,
        niche: lead.niche,
        status: lead.status,
        temperature: lead.temperature,
      },
      latestAnalysis,
      previousMessages,
      conversationHistory,
      incomingMessage: { content: data.message, channel },
    }

    // ── Persiste a mensagem recebida do lead como conversa (tarefa 6) ────────
    await prisma.leadConversation.create({
      data: {
        leadId,
        channel,
        direction: 'RECEIVED',
        content:   data.message,
      },
    })

    // ── Dispara para o n8n — o backend NUNCA chama Gemini diretamente ────────
    let dispatchedToN8n = false
    if (env.N8N_REPLY_ASSISTANT_WEBHOOK_URL) {
      try {
        const response = await fetch(env.N8N_REPLY_ASSISTANT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(context),
        })
        dispatchedToN8n = response.ok
      } catch {
        // Falha de rede ao notificar o n8n não deve quebrar a requisição do
        // operador — o contexto já foi persistido e pode ser reprocessado.
        dispatchedToN8n = false
      }
    }

    return { context, dispatchedToN8n }
  }

  /**
   * Callback chamado pelo n8n após o Gemini gerar a sugestão de resposta.
   * Salva a sugestão como uma conversa SENT com metadata identificando que
   * foi gerada pelo reply-assistant (tarefa 6), sem marcá-la como
   * efetivamente enviada ao lead — isso fica a cargo do operador.
   */
  async saveSuggestion(leadId: string, data: ReplyAssistantCallbackInput) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')

    const metadata: Prisma.InputJsonValue = {
      source:               'reply-assistant',
      intentAnalysis:       data.intentAnalysis ?? null,
      objections:           Array.isArray(data.objections) ? data.objections : [data.objections].filter(Boolean),
      leadStage:             data.leadStage ?? null,
      recommendedNextSteps: Array.isArray(data.recommendedNextSteps)
        ? data.recommendedNextSteps
        : [data.recommendedNextSteps].filter(Boolean),
      rawOutput: data.rawOutput ?? null,
    }

    return prisma.leadConversation.create({
      data: {
        leadId,
        channel:   'INSTAGRAM',
        direction: 'SENT',
        content:   data.suggestedReply,
        metadata,
      },
    })
  }

  async getFullConversation(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')

    return prisma.leadConversation.findMany({
      where:   { leadId },
      orderBy: { createdAt: 'asc' },
    })
  }
}

export const replyAssistantService = new ReplyAssistantService()
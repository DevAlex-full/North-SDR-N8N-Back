import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { N8nLeadAnalysisInput } from './webhooks.schema'

// ─── Tipos locais (usados apenas internamente neste service) ─────────────────
type LeadTemperature = 'HOT' | 'WARM' | 'COLD' | 'UNKNOWN'
type MessageChannel  = 'INSTAGRAM' | 'WHATSAPP' | 'LINKEDIN' | 'EMAIL' | 'OTHER'
type MessageType     = 'INITIAL' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Garante que o valor seja sempre string[]. */
function toArray(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  return value.split(',').map((s) => s.trim()).filter(Boolean)
}

/**
 * Mapeia classification → LeadTemperature.
 *
 * QUENTE | HOT           → HOT
 * MORNO  | WARM | MÉDIO  → WARM
 * FRIO   | COLD          → COLD
 * qualquer outro         → UNKNOWN
 */
function classificationToTemperature(classification?: string | null): LeadTemperature {
  if (!classification) return 'UNKNOWN'
  const n = classification.toUpperCase().trim()
  if (n.includes('QUENTE') || n.includes('HOT'))                                                   return 'HOT'
  if (n.includes('MORNO') || n.includes('WARM') || n.includes('MÉDIO') || n.includes('MEDIO'))    return 'WARM'
  if (n.includes('FRIO')  || n.includes('COLD'))                                                   return 'COLD'
  return 'UNKNOWN'
}

/** Mapeia preferredChannel → MessageChannel. */
function toMessageChannel(preferredChannel?: string | null): MessageChannel {
  if (!preferredChannel) return 'INSTAGRAM'
  const map: Record<string, MessageChannel> = {
    WHATSAPP: 'WHATSAPP', LINKEDIN: 'LINKEDIN',
    EMAIL: 'EMAIL', OTHER: 'OTHER', OUTRO: 'OTHER',
  }
  return map[preferredChannel.toUpperCase().trim()] ?? 'INSTAGRAM'
}

/**
 * Normaliza nome de empresa para comparação de duplicidade.
 * Remove acentos, pontuação, espaços extras e converte para lowercase.
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Configuração de follow-ups ────────────────────────────────────────────
//  INITIAL     → +0 dias (hoje às 09:00)
//  FOLLOW_UP_1 → +3 dias
//  FOLLOW_UP_2 → +7 dias
const FOLLOWUP_CONFIG: Record<MessageType, { offsetDays: number; note: (na?: string | null) => string }> = {
  INITIAL: {
    offsetDays: 0,
    note: (na) => na ? `Enviar mensagem inicial. Próxima ação: ${na}` : 'Enviar mensagem inicial ao lead.',
  },
  FOLLOW_UP_1: {
    offsetDays: 3,
    note: () => 'Enviar follow-up 1 — 3 dias após o contato inicial.',
  },
  FOLLOW_UP_2: {
    offsetDays: 7,
    note: () => 'Enviar follow-up 2 — 7 dias após o contato inicial.',
  },
}

// ─── Service ─────────────────────────────────────────────────────────────────
export class WebhooksService {
  async processN8nLeadAnalysis(data: N8nLeadAnalysisInput) {
    const {
      companyName, instagram, website, niche, preferredChannel, source, notes,
      classification, confirmedInfo, observations, hypotheses,
      executiveSummary, commercialDiagnosis, pains, opportunities,
      strategy, closingProbability, nextAction, missingInfo,
      initialMessage, followUp1, followUp2, rawInput, rawOutput,
    } = data

    const temperature = classificationToTemperature(classification)
    const channel     = toMessageChannel(preferredChannel)

    // ── 1. Resolver Lead (upsert sem duplicidade) ─────────────────────────────
    const lead = await this.resolveOrCreateLead({
      companyName,
      instagram:        instagram        ?? null,
      website:          website          ?? null,
      niche:            niche            ?? null,
      preferredChannel: preferredChannel ?? null,
      source:           source           ?? 'n8n',
      notes:            notes            ?? null,
      temperature,
    })

    // ── 1b. Inicializar LeadOutcome com dataPrimeiroContato e canalContato ────
    // Roda em toda chamada do webhook (lead novo ou existente), mas só seta
    // dataPrimeiroContato na criação do outcome — nunca sobrescreve um contato
    // já registrado. canalContato é atualizado para refletir o canal mais
    // recente informado pelo n8n, já que preferredChannel pode mudar entre análises.
    await prisma.leadOutcome.upsert({
      where:  { leadId: lead.id },
      update: { canalContato: channel },
      create: { leadId: lead.id, status: 'NEW', canalContato: channel, dataPrimeiroContato: new Date() },
    })

    // ── 2. Criar Análise ──────────────────────────────────────────────────────
    const analysis = await prisma.leadAnalysis.create({
      data: {
        leadId:              lead.id,
        classification:      classification      ?? null,
        executiveSummary:    executiveSummary    ?? null,
        commercialDiagnosis: commercialDiagnosis ?? null,
        confirmedInfo:       toArray(confirmedInfo),
        observations:        toArray(observations),
        hypotheses:          toArray(hypotheses),
        pains:               toArray(pains),
        opportunities:       toArray(opportunities),
        strategy:            strategy            ?? null,
        closingProbability:  closingProbability  ?? null,
        nextAction:          nextAction          ?? null,
        missingInfo:         toArray(missingInfo),
        // rawInput é Record<string, unknown> do Zod — cast para o tipo Prisma
        rawInput:            (rawInput ?? {}) as Prisma.InputJsonValue,
        rawOutput:           rawOutput           ?? null,
      },
    })

    // ── 3. Criar Mensagens Sugeridas ──────────────────────────────────────────
    const messagesToCreate: { type: MessageType; content: string }[] = []
    if (initialMessage?.trim()) messagesToCreate.push({ type: 'INITIAL',     content: initialMessage.trim() })
    if (followUp1?.trim())      messagesToCreate.push({ type: 'FOLLOW_UP_1', content: followUp1.trim() })
    if (followUp2?.trim())      messagesToCreate.push({ type: 'FOLLOW_UP_2', content: followUp2.trim() })

    const messages = await Promise.all(
      messagesToCreate.map((m) =>
        prisma.messageSuggestion.create({
          data: {
            leadId:     lead.id,
            analysisId: analysis.id,
            type:       m.type,
            channel,
            content:    m.content,
            status:     'DRAFT',
          },
        }),
      ),
    )

    // ── 4. Criar Follow-up Tasks com datas corretas ───────────────────────────
    //  INITIAL     → hoje (+0 dias às 09:00)
    //  FOLLOW_UP_1 → +3 dias
    //  FOLLOW_UP_2 → +7 dias
    const baseDate = new Date()
    baseDate.setHours(9, 0, 0, 0)

    const followups = (
      await Promise.all(
        messages.map((msg) => {
          const cfg = FOLLOWUP_CONFIG[msg.type as MessageType]
          if (!cfg) return Promise.resolve(null)

          const dueDate = new Date(baseDate)
          dueDate.setDate(dueDate.getDate() + cfg.offsetDays)

          return prisma.followUpTask.create({
            data: {
              leadId:    lead.id,
              messageId: msg.id,
              dueDate,
              status:    'PENDING',
              notes:     cfg.note(nextAction),
            },
          })
        }),
      )
    ).filter((f): f is NonNullable<typeof f> => f !== null)

    return { lead, analysis, messages, followups }
  }

  // ─── Resolve ou cria Lead sem duplicidade ─────────────────────────────────
  //  1. Por instagram (campo unique)
  //  2. Por companyName normalizado (sem instagram)
  //  3. Cria novo
  private async resolveOrCreateLead(params: {
    companyName:      string
    instagram:        string | null
    website:          string | null
    niche:            string | null
    preferredChannel: string | null
    source:           string
    notes:            string | null
    temperature:      LeadTemperature
  }) {
    const { companyName, instagram, temperature, source, website, niche, preferredChannel, notes } = params

    const optionalFields = Object.fromEntries(
      Object.entries({ website, niche, preferredChannel, notes }).filter(([, v]) => v !== null),
    )

    const updateData = { companyName, temperature, ...optionalFields }
    const createData = { companyName, temperature, source, status: 'NEW' as const, score: 0, ...optionalFields }

    // Prioridade 1: instagram (unique) ────────────────────────────────────────
    if (instagram) {
      return prisma.lead.upsert({
        where:  { instagram },
        update: updateData,
        create: { ...createData, instagram },
      })
    }

    // Prioridade 2: companyName normalizado ───────────────────────────────────
    const normalizedTarget = normalizeCompanyName(companyName)
    const candidates = await prisma.lead.findMany({
      where:  { instagram: null },
      select: { id: true, companyName: true },
    })

    const existing = candidates.find(
      (c) => normalizeCompanyName(c.companyName) === normalizedTarget,
    )

    if (existing) {
      return prisma.lead.update({
        where: { id: existing.id },
        data:  updateData,
      })
    }

    // Prioridade 3: criar novo ─────────────────────────────────────────────────
    return prisma.lead.create({
      data: { ...createData, instagram: null },
    })
  }
}

export const webhooksService = new WebhooksService()
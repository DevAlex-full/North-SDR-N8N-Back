import { prisma } from '../../config/prisma'
import { LearningQuery } from './learning.schema'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CLOSED_WON  = 'WON' as const
const CLOSED_LOST = 'LOST' as const

function pct(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 10000) / 100 // 2 casas decimais
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
}

function sinceFilter(query: LearningQuery) {
  return query.since ? { createdAt: { gte: query.since } } : {}
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class LearningService {
  /**
   * Resumo executivo: visão rápida do estado geral do funil.
   * GET /learning/summary
   */
  async getSummary(query: LearningQuery) {
    const where = sinceFilter(query)

    const [totalLeads, byStatus, outcomes] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.groupBy({ by: ['status'], where, _count: { _all: true } }),
      prisma.leadOutcome.findMany({
        where: query.since ? { createdAt: { gte: query.since } } : {},
        select: { status: true, valorFechado: true, dataPrimeiroContato: true, dataFechamento: true },
      }),
    ])

    const won  = outcomes.filter((o) => o.status === CLOSED_WON)
    const lost = outcomes.filter((o) => o.status === CLOSED_LOST)
    const meetings  = await prisma.leadOutcome.count({ where: { dataReuniao: { not: null } } })
    const proposals = await prisma.leadOutcome.count({ where: { dataProposta: { not: null } } })

    const faturamentoTotal = won.reduce((s, o) => s + Number(o.valorFechado ?? 0), 0)

    const closingDaysList = won
      .filter((o) => o.dataPrimeiroContato && o.dataFechamento)
      .map((o) => {
        const diffMs = o.dataFechamento!.getTime() - o.dataPrimeiroContato!.getTime()
        return diffMs / (1000 * 60 * 60 * 24)
      })

    return {
      totalLeads,
      totalReunioes:    meetings,
      totalPropostas:   proposals,
      totalFechamentos: won.length,
      totalPerdas:      lost.length,
      taxaConversaoGeral: pct(won.length, won.length + lost.length),
      faturamentoTotal:   Math.round(faturamentoTotal * 100) / 100,
      ticketMedio:        avg(won.map((o) => Number(o.valorFechado ?? 0))),
      tempoMedioFechamentoDias: avg(closingDaysList),
      leadsPorStatus: byStatus.map((s) => ({ status: s.status, total: s._count._all })),
    }
  }

  /**
   * Métricas detalhadas: conversão geral, por nicho, por canal, taxa de resposta,
   * ticket médio, tempo médio de fechamento, motivos de perda mais frequentes.
   * GET /learning/metrics
   */
  async getMetrics(query: LearningQuery) {
    const since = query.since

    const leads = await prisma.lead.findMany({
      where: since ? { createdAt: { gte: since } } : {},
      select: {
        id: true,
        niche: true,
        outcome: {
          select: {
            status: true, lossReason: true, canalContato: true,
            valorFechado: true, dataPrimeiroContato: true, dataResposta: true, dataFechamento: true,
          },
        },
      },
    })

    const withOutcome = leads.filter((l) => l.outcome !== null)
    const won  = withOutcome.filter((l) => l.outcome!.status === CLOSED_WON)
    const lost = withOutcome.filter((l) => l.outcome!.status === CLOSED_LOST)
    const responded = withOutcome.filter((l) => l.outcome!.dataResposta !== null)

    // ── Conversão por nicho ──────────────────────────────────────────────────
    const nicheMap = new Map<string, { won: number; lost: number; total: number; faturamento: number }>()
    for (const lead of withOutcome) {
      const niche = lead.niche ?? 'Não informado'
      const entry = nicheMap.get(niche) ?? { won: 0, lost: 0, total: 0, faturamento: 0 }
      entry.total += 1
      if (lead.outcome!.status === CLOSED_WON) {
        entry.won += 1
        entry.faturamento += Number(lead.outcome!.valorFechado ?? 0)
      }
      if (lead.outcome!.status === CLOSED_LOST) entry.lost += 1
      nicheMap.set(niche, entry)
    }
    const conversaoPorNicho = [...nicheMap.entries()].map(([niche, d]) => ({
      niche,
      totalLeads: d.total,
      fechamentos: d.won,
      perdas: d.lost,
      taxaConversao: pct(d.won, d.won + d.lost),
      faturamento: Math.round(d.faturamento * 100) / 100,
    })).sort((a, b) => b.taxaConversao - a.taxaConversao)

    // ── Conversão e resposta por canal ───────────────────────────────────────
    const channelMap = new Map<string, { won: number; lost: number; total: number; respondidos: number }>()
    for (const lead of withOutcome) {
      const channel = lead.outcome!.canalContato ?? 'OTHER'
      const entry = channelMap.get(channel) ?? { won: 0, lost: 0, total: 0, respondidos: 0 }
      entry.total += 1
      if (lead.outcome!.dataResposta !== null) entry.respondidos += 1
      if (lead.outcome!.status === CLOSED_WON)  entry.won += 1
      if (lead.outcome!.status === CLOSED_LOST) entry.lost += 1
      channelMap.set(channel, entry)
    }
    const conversaoPorCanal = [...channelMap.entries()].map(([canal, d]) => ({
      canal,
      totalLeads: d.total,
      taxaResposta: pct(d.respondidos, d.total),
      taxaConversao: pct(d.won, d.won + d.lost),
    })).sort((a, b) => b.taxaConversao - a.taxaConversao)

    // ── Motivos de perda mais frequentes ─────────────────────────────────────
    const lossReasonMap = new Map<string, number>()
    for (const lead of lost) {
      const reason = lead.outcome!.lossReason ?? 'OUTRO'
      lossReasonMap.set(reason, (lossReasonMap.get(reason) ?? 0) + 1)
    }
    const motivosPerda = [...lossReasonMap.entries()]
      .map(([motivo, total]) => ({ motivo, total, percentual: pct(total, lost.length) }))
      .sort((a, b) => b.total - a.total)

    // ── Tempo médio de fechamento ────────────────────────────────────────────
    const closingDays = won
      .filter((l) => l.outcome!.dataPrimeiroContato && l.outcome!.dataFechamento)
      .map((l) => (l.outcome!.dataFechamento!.getTime() - l.outcome!.dataPrimeiroContato!.getTime()) / 86_400_000)

    return {
      taxaConversaoGeral: pct(won.length, won.length + lost.length),
      taxaRespostaGeral:  pct(responded.length, withOutcome.length),
      ticketMedio:        avg(won.map((l) => Number(l.outcome!.valorFechado ?? 0))),
      tempoMedioFechamentoDias: avg(closingDays),
      conversaoPorNicho,
      conversaoPorCanal,
      motivosPerdaFrequentes: motivosPerda,
    }
  }

  /**
   * Rankings automáticos: top nichos/canais/estratégias por diferentes critérios.
   * GET /learning/rankings
   */
  async getRankings(query: LearningQuery) {
    const metrics = await this.getMetrics(query)

    const topNichosPorConversao = [...metrics.conversaoPorNicho]
      .filter((n) => n.fechamentos + n.perdas >= 1)
      .sort((a, b) => b.taxaConversao - a.taxaConversao)
      .slice(0, 10)

    const topNichosPorFaturamento = [...metrics.conversaoPorNicho]
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10)

    const topNichosPorFechamentos = [...metrics.conversaoPorNicho]
      .sort((a, b) => b.fechamentos - a.fechamentos)
      .slice(0, 10)

    const topCanaisPorConversao = [...metrics.conversaoPorCanal]
      .sort((a, b) => b.taxaConversao - a.taxaConversao)
      .slice(0, 10)

    const topCanaisPorResposta = [...metrics.conversaoPorCanal]
      .sort((a, b) => b.taxaResposta - a.taxaResposta)
      .slice(0, 10)

    // Top estratégias por resultado: usa LeadAnalysis.strategy cruzado com outcome WON
    const wonAnalyses = await prisma.leadAnalysis.findMany({
      where: { lead: { outcome: { status: CLOSED_WON } }, strategy: { not: null } },
      select: { strategy: true },
    })
    const allAnalysesWithStrategy = await prisma.leadAnalysis.findMany({
      where: { lead: { outcome: { isNot: null } }, strategy: { not: null } },
      select: { strategy: true, lead: { select: { outcome: { select: { status: true } } } } },
    })

    const strategyMap = new Map<string, { won: number; total: number }>()
    for (const a of allAnalysesWithStrategy) {
      const key = a.strategy as string
      const entry = strategyMap.get(key) ?? { won: 0, total: 0 }
      entry.total += 1
      if (a.lead.outcome?.status === CLOSED_WON) entry.won += 1
      strategyMap.set(key, entry)
    }
    const topEstrategiasPorResultado = [...strategyMap.entries()]
      .map(([estrategia, d]) => ({ estrategia, totalUsos: d.total, fechamentos: d.won, taxaConversao: pct(d.won, d.total) }))
      .sort((a, b) => b.taxaConversao - a.taxaConversao)
      .slice(0, 10)

    return {
      topNichosPorConversao,
      topNichosPorFaturamento,
      topNichosPorFechamentos,
      topCanaisPorConversao,
      topCanaisPorResposta,
      topEstrategiasPorResultado,
      _debug: { totalAnalisesComEstrategiaEFechamento: wonAnalyses.length },
    }
  }

  /** GET /learning/niches — detalhe completo por nicho. */
  async getNiches(query: LearningQuery) {
    const metrics = await this.getMetrics(query)
    return metrics.conversaoPorNicho
  }

  /** GET /learning/channels — detalhe completo por canal. */
  async getChannels(query: LearningQuery) {
    const metrics = await this.getMetrics(query)
    return metrics.conversaoPorCanal
  }

  /** GET /learning/loss-reasons — detalhe completo dos motivos de perda. */
  async getLossReasons(query: LearningQuery) {
    const metrics = await this.getMetrics(query)
    return metrics.motivosPerdaFrequentes
  }
}

export const learningService = new LearningService()
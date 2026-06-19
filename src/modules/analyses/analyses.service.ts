import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { CreateAnalysisInput } from './analyses.schema'
import { NotFoundError } from '../../utils/errors'

export class AnalysesService {
  async create(data: CreateAnalysisInput) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } })
    if (!lead) throw new NotFoundError('Lead')

    return prisma.leadAnalysis.create({
      data: {
        ...data,
        rawInput: (data.rawInput ?? {}) as Prisma.InputJsonValue,
      },
    })
  }

  async findAll() {
    return prisma.leadAnalysis.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: { select: { id: true, companyName: true, instagram: true, status: true } } },
    })
  }

  async findById(id: string) {
    const analysis = await prisma.leadAnalysis.findUnique({
      where: { id },
      include: {
        lead:      { select: { id: true, companyName: true, instagram: true, status: true } },
        messages:  true,
        feedbacks: true,
      },
    })
    if (!analysis) throw new NotFoundError('Análise')
    return analysis
  }

  async findByLeadId(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')
    return prisma.leadAnalysis.findMany({
      where:   { leadId },
      orderBy: { createdAt: 'desc' },
      include: { messages: true, _count: { select: { feedbacks: true } } },
    })
  }
}

export const analysesService = new AnalysesService()

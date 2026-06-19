import { prisma } from '../../config/prisma'
import { CreateFeedbackInput } from './feedbacks.schema'
import { NotFoundError } from '../../utils/errors'

export class FeedbacksService {
  async create(data: CreateFeedbackInput) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } })
    if (!lead) throw new NotFoundError('Lead')
    return prisma.agentFeedback.create({ data })
  }

  async findAll() {
    return prisma.agentFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        lead:     { select: { id: true, companyName: true, instagram: true } },
        analysis: { select: { id: true, classification: true } },
      },
    })
  }

  async findByLeadId(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')
    return prisma.agentFeedback.findMany({
      where:   { leadId },
      orderBy: { createdAt: 'desc' },
      include: { analysis: { select: { id: true, classification: true, executiveSummary: true } } },
    })
  }
}

export const feedbacksService = new FeedbacksService()

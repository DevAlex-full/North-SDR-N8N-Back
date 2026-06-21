import { Prisma } from '@prisma/client'
import { prisma } from '../../config/prisma'
import { NotFoundError } from '../../utils/errors'
import { CreateConversationInput } from './conversations.schema'

export class ConversationsService {
  async create(leadId: string, data: CreateConversationInput) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')

    return prisma.leadConversation.create({
      data: {
        leadId,
        channel:   data.channel,
        direction: data.direction,
        content:   data.content,
        metadata:  (data.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    })
  }

  async findByLeadId(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')

    return prisma.leadConversation.findMany({
      where:   { leadId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async findAll() {
    return prisma.leadConversation.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: { select: { id: true, companyName: true, instagram: true } } },
    })
  }
}

export const conversationsService = new ConversationsService()
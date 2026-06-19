import { prisma } from '../../config/prisma'
import { CreateMessageInput, UpdateMessageInput } from './messages.schema'
import { NotFoundError } from '../../utils/errors'

export class MessagesService {
  async create(data: CreateMessageInput) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } })
    if (!lead) throw new NotFoundError('Lead')
    return prisma.messageSuggestion.create({ data })
  }

  async findAll() {
    return prisma.messageSuggestion.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: { select: { id: true, companyName: true, instagram: true } } },
    })
  }

  async findByLeadId(leadId: string) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')
    return prisma.messageSuggestion.findMany({
      where:   { leadId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(id: string, data: UpdateMessageInput) {
    const msg = await prisma.messageSuggestion.findUnique({ where: { id } })
    if (!msg) throw new NotFoundError('Mensagem')
    return prisma.messageSuggestion.update({ where: { id }, data })
  }
}

export const messagesService = new MessagesService()

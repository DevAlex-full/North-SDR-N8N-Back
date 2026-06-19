import { prisma } from '../../config/prisma'
import { CreateLeadInput, UpdateLeadInput } from './leads.schema'
import { NotFoundError } from '../../utils/errors'

export class LeadsService {
  async create(data: CreateLeadInput) {
    return prisma.lead.create({ data })
  }

  async findAll() {
    return prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { analyses: true, messages: true, followups: true } },
      },
    })
  }

  async findById(id: string) {
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        analyses:  { orderBy: { createdAt: 'desc' }, take: 1 },
        messages:  { orderBy: { createdAt: 'desc' }, take: 3 },
        followups: { where: { status: 'PENDING' }, orderBy: { dueDate: 'asc' } },
        _count:    { select: { analyses: true, messages: true, followups: true, feedbacks: true } },
      },
    })
    if (!lead) throw new NotFoundError('Lead')
    return lead
  }

  async update(id: string, data: UpdateLeadInput) {
    await this.findById(id)
    return prisma.lead.update({ where: { id }, data })
  }

  async remove(id: string) {
    await this.findById(id)
    return prisma.lead.delete({ where: { id } })
  }
}

export const leadsService = new LeadsService()

import { prisma } from '../../config/prisma'
import { CreateFollowUpInput, UpdateFollowUpInput } from './followups.schema'
import { NotFoundError } from '../../utils/errors'

export class FollowUpsService {
  async create(data: CreateFollowUpInput) {
    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } })
    if (!lead) throw new NotFoundError('Lead')
    return prisma.followUpTask.create({ data })
  }

  async findAll() {
    // Marca como OVERDUE tarefas PENDING com dueDate vencida
    await prisma.followUpTask.updateMany({
      where: { status: 'PENDING', dueDate: { lt: new Date() } },
      data:  { status: 'OVERDUE' },
    })
    return prisma.followUpTask.findMany({
      orderBy: { dueDate: 'asc' },
      include: {
        lead:    { select: { id: true, companyName: true, instagram: true, status: true } },
        message: { select: { id: true, type: true, channel: true, content: true } },
      },
    })
  }

  async findToday() {
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end   = new Date(); end.setHours(23, 59, 59, 999)

    return prisma.followUpTask.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        status:  { in: ['PENDING', 'OVERDUE'] },
      },
      orderBy: { dueDate: 'asc' },
      include: {
        lead:    { select: { id: true, companyName: true, instagram: true, status: true, temperature: true } },
        message: { select: { id: true, type: true, channel: true, content: true } },
      },
    })
  }

  async update(id: string, data: UpdateFollowUpInput) {
    const fu = await prisma.followUpTask.findUnique({ where: { id } })
    if (!fu) throw new NotFoundError('Follow-up')
    return prisma.followUpTask.update({ where: { id }, data })
  }
}

export const followUpsService = new FollowUpsService()

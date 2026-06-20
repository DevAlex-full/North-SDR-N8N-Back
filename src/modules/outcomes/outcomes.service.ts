import { prisma } from '../../config/prisma'
import { NotFoundError } from '../../utils/errors'
import {
  UpsertOutcomeInput,
  RegisterMeetingInput,
  RegisterProposalInput,
  RegisterWonInput,
  RegisterLostInput,
} from './outcomes.schema'

export class OutcomesService {
  /** Garante que o Lead existe antes de qualquer operação de outcome. */
  private async assertLeadExists(leadId: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead) throw new NotFoundError('Lead')
  }

  async getByLeadId(leadId: string) {
    await this.assertLeadExists(leadId)
    const outcome = await prisma.leadOutcome.findUnique({ where: { leadId } })
    if (!outcome) throw new NotFoundError('Outcome do lead')
    return outcome
  }

  /** Upsert genérico — usado quando o n8n/CRM quer setar múltiplos campos de uma vez. */
  async upsert(leadId: string, data: UpsertOutcomeInput) {
    await this.assertLeadExists(leadId)

    const outcome = await prisma.leadOutcome.upsert({
      where:  { leadId },
      update: data,
      create: { leadId, ...data },
    })

    // Mantém Lead.status sincronizado quando o outcome traz status novo
    if (data.status) {
      await prisma.lead.update({ where: { id: leadId }, data: { status: data.status } })
    }

    return outcome
  }

  async registerMeeting(leadId: string, data: RegisterMeetingInput) {
    await this.assertLeadExists(leadId)

    const outcome = await prisma.leadOutcome.upsert({
      where: { leadId },
      update: {
        status:       'MEETING_SCHEDULED',
        dataReuniao:  data.dataReuniao,
        canalContato: data.canalContato,
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
      create: {
        leadId,
        status:       'MEETING_SCHEDULED',
        dataReuniao:  data.dataReuniao,
        canalContato: data.canalContato,
        observacoes:  data.observacoes,
      },
    })

    await prisma.lead.update({ where: { id: leadId }, data: { status: 'MEETING_SCHEDULED' } })
    return outcome
  }

  async registerProposal(leadId: string, data: RegisterProposalInput) {
    await this.assertLeadExists(leadId)

    const outcome = await prisma.leadOutcome.upsert({
      where: { leadId },
      update: {
        status:        'PROPOSAL_SENT',
        valorProposta: data.valorProposta,
        dataProposta:  data.dataProposta,
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
      create: {
        leadId,
        status:        'PROPOSAL_SENT',
        valorProposta: data.valorProposta,
        dataProposta:  data.dataProposta,
        observacoes:   data.observacoes,
      },
    })

    await prisma.lead.update({ where: { id: leadId }, data: { status: 'PROPOSAL_SENT' } })
    return outcome
  }

  async registerWon(leadId: string, data: RegisterWonInput) {
    await this.assertLeadExists(leadId)

    const outcome = await prisma.leadOutcome.upsert({
      where: { leadId },
      update: {
        status:         'WON',
        valorFechado:   data.valorFechado,
        dataFechamento: data.dataFechamento,
        lossReason:     null,
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
      create: {
        leadId,
        status:         'WON',
        valorFechado:   data.valorFechado,
        dataFechamento: data.dataFechamento,
        observacoes:    data.observacoes,
      },
    })

    await prisma.lead.update({ where: { id: leadId }, data: { status: 'WON' } })
    return outcome
  }

  async registerLost(leadId: string, data: RegisterLostInput) {
    await this.assertLeadExists(leadId)

    const outcome = await prisma.leadOutcome.upsert({
      where: { leadId },
      update: {
        status:         'LOST',
        lossReason:     data.lossReason,
        dataFechamento: data.dataFechamento,
        ...(data.observacoes !== undefined && { observacoes: data.observacoes }),
      },
      create: {
        leadId,
        status:         'LOST',
        lossReason:     data.lossReason,
        dataFechamento: data.dataFechamento,
        observacoes:    data.observacoes,
      },
    })

    await prisma.lead.update({ where: { id: leadId }, data: { status: 'LOST' } })
    return outcome
  }
}

export const outcomesService = new OutcomesService()
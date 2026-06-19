import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const lead = await prisma.lead.upsert({
    where: { instagram: '@northagency' },
    update: {},
    create: {
      companyName: 'North Agency',
      instagram: '@northagency',
      website: 'https://northagency.com.br',
      niche: 'Agência de Marketing Digital',
      preferredChannel: 'Instagram',
      source: 'seed',
      notes: 'Lead de exemplo gerado pelo seed',
      status: 'NEW',
      temperature: 'WARM',
      score: 75,
    },
  })
  console.log(`✅ Lead: ${lead.companyName} (${lead.id})`)

  const analysis = await prisma.leadAnalysis.create({
    data: {
      leadId: lead.id,
      classification: 'Alto Potencial',
      executiveSummary: 'Agência com posicionamento forte e perfil ideal para nossa solução.',
      commercialDiagnosis: 'Empresa investe em ferramentas digitais. Decisor ativo nas redes.',
      confirmedInfo: ['Agência ativa no Instagram', 'Site profissional'],
      observations: ['Pouca automação visível', 'Potencial de expansão'],
      hypotheses: ['Pode estar insatisfeita com CRM atual'],
      pains: ['Gestão manual de leads', 'Falta de automação'],
      opportunities: ['Implementar SDR automatizado', 'CRM integrado'],
      strategy: 'Abordar via DM com proposta de diagnóstico gratuito',
      closingProbability: 'Alta (70%)',
      nextAction: 'Enviar mensagem inicial no Instagram',
      missingInfo: ['Budget disponível', 'Tamanho do time'],
      rawInput: { source: 'seed' },
      rawOutput: 'Análise gerada pelo seed',
    },
  })
  console.log(`✅ Análise: ${analysis.id}`)

  const message = await prisma.messageSuggestion.create({
    data: {
      leadId: lead.id,
      analysisId: analysis.id,
      type: 'INITIAL',
      channel: 'INSTAGRAM',
      content: 'Oi! Vi o trabalho incrível da @northagency. Tenho uma ideia de como automatizar sua captação de leads. Posso mostrar em 5 minutos?',
      status: 'DRAFT',
    },
  })
  console.log(`✅ Mensagem: ${message.id}`)

  const today = new Date()
  today.setHours(9, 0, 0, 0)

  await prisma.followUpTask.create({
    data: {
      leadId: lead.id,
      messageId: message.id,
      dueDate: today,
      status: 'PENDING',
      notes: 'Enviar mensagem inicial ao lead.',
    },
  })
  console.log('✅ Follow-up criado')

  await prisma.agentFeedback.create({
    data: {
      leadId: lead.id,
      analysisId: analysis.id,
      rating: 5,
      problemType: 'GOOD_RESULT',
      comment: 'Análise precisa e mensagem bem personalizada.',
      expectedImprovement: 'Nenhuma.',
    },
  })
  console.log('✅ Feedback criado')

  console.log('\n🎉 Seed concluído!')
}

main()
  .catch((e) => { console.error('❌ Erro no seed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

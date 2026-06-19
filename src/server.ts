import 'dotenv/config'
import { buildApp } from './app'
import { env } from './config/env'
import { prisma } from './config/prisma'

async function main() {
  const app = await buildApp()

  try {
    await prisma.$connect()
    app.log.info('✅ Banco de dados conectado')

    await app.listen({ port: env.PORT, host: '0.0.0.0' })
    app.log.info(`🚀 North SDR Backend rodando em http://0.0.0.0:${env.PORT}`)
    app.log.info(`🌍 Ambiente: ${env.NODE_ENV}`)
  } catch (err) {
    app.log.error(err, 'Erro ao iniciar servidor')
    await prisma.$disconnect()
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM recebido — encerrando graciosamente...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT recebido — encerrando graciosamente...')
  await prisma.$disconnect()
  process.exit(0)
})

void main()

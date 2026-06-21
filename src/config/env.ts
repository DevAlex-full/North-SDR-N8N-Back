import { z } from 'zod'
import 'dotenv/config'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  DIRECT_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),
  N8N_WEBHOOK_API_KEY: z.string().min(1, 'N8N_WEBHOOK_API_KEY é obrigatória'),
  // URL do workflow n8n responsável por gerar a sugestão de resposta
  // (Fase 3.5 — reply-assistant). Opcional: se ausente, o backend monta e
  // persiste o contexto normalmente, mas não dispara a chamada ao n8n —
  // permite deploy gradual sem quebrar o ambiente até o node ser criado.
  N8N_REPLY_ASSISTANT_WEBHOOK_URL: z.string().url().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
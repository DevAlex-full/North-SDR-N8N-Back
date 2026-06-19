# 🧠 North SDR Backend

Backend do **North SDR CRM Agent** — cérebro e memória do agente SDR inteligente.

**Stack:** Node.js 20 · TypeScript Strict · Fastify · Prisma · PostgreSQL (Supabase) · Render

---

## 🚀 Início Rápido (Local)

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# 3. Gerar Prisma Client
npx prisma generate

# 4. Criar e aplicar migration (primeira vez)
npx prisma migrate dev --name init

# 5. (Opcional) Popular banco com dados de exemplo
npm run prisma:seed

# 6. Iniciar em modo desenvolvimento
npm run dev
```

Teste:
```bash
curl http://localhost:3333/health
```

---

## 🔑 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | URL Supabase com pooler (`?pgbouncer=true`) |
| `DIRECT_URL` | ✅ | URL direta Supabase (migrations) |
| `PORT` | — | Porta do servidor (padrão: `3333`) |
| `NODE_ENV` | — | `development` ou `production` |
| `CORS_ORIGIN` | — | Origens permitidas (`*` ou domínios separados por vírgula) |
| `N8N_WEBHOOK_API_KEY` | ✅ | Chave secreta para autenticação (`x-api-key`) |

### Onde obter as URLs do Supabase
1. Acesse [supabase.com](https://supabase.com) → seu projeto → **Settings → Database**
2. Em **Connection String**:
   - **Transaction mode** → `DATABASE_URL` (adicione `?pgbouncer=true`)
   - **Session mode** → `DIRECT_URL`

Gerar API Key segura:
```bash
openssl rand -hex 32
```

---

## ☁️ Deploy no Render

### Opção 1: Blueprint (render.yaml) — recomendado

1. Faça push do projeto para o GitHub
2. [render.com](https://render.com) → **New → Blueprint**
3. Conecte o repositório — o `render.yaml` é detectado automaticamente
4. Configure as variáveis de ambiente no painel
5. **Deploy**

O Render executará automaticamente:
```
npm install && npx prisma generate && npm run build && npx prisma migrate deploy
```

### Opção 2: Web Service manual

- **Environment:** Node
- **Build Command:** `npm install && npx prisma generate && npm run build && npx prisma migrate deploy`
- **Start Command:** `npm start`
- **Health Check Path:** `/health`

---

## 🔐 Segurança

Todas as rotas exceto `GET /health` exigem o header:

```
x-api-key: <N8N_WEBHOOK_API_KEY>
```

Sem a chave correta, retorna `401 Unauthorized`.

---

## 📡 Endpoints

### Público
```
GET  /health
```

### Protegidos (x-api-key obrigatório)

**Leads**
```
POST   /leads
GET    /leads
GET    /leads/:id
PATCH  /leads/:id
DELETE /leads/:id
```

**Análises**
```
POST   /analyses
GET    /analyses
GET    /analyses/:id
GET    /leads/:leadId/analyses
```

**Mensagens**
```
POST   /messages
GET    /messages
GET    /leads/:leadId/messages
PATCH  /messages/:id
```

**Follow-ups**
```
POST   /followups
GET    /followups
GET    /followups/today
PATCH  /followups/:id
```

**Feedbacks**
```
POST   /feedbacks
GET    /feedbacks
GET    /leads/:leadId/feedbacks
```

**Webhook n8n**
```
POST   /webhooks/n8n/lead-analysis
```

---

## 🔗 Configurar no n8n

### Nó HTTP Request

| Campo | Valor |
|---|---|
| Method | `POST` |
| URL | `https://seu-app.onrender.com/webhooks/n8n/lead-analysis` |
| Authentication | Header Auth |
| Header Name | `x-api-key` |
| Header Value | `{{ $env.NORTH_API_KEY }}` |
| Body Content Type | JSON |

### Payload completo

```json
{
  "companyName": "Agência Exemplo",
  "instagram": "@agenciaexemplo",
  "website": "https://agenciaexemplo.com.br",
  "niche": "Marketing Digital",
  "preferredChannel": "Instagram",
  "source": "n8n",
  "notes": "Lead captado via formulário",
  "classification": "Alto Potencial - QUENTE",
  "confirmedInfo": ["Perfil ativo no Instagram", "Site profissional"],
  "observations": ["Sem automação visível"],
  "hypotheses": ["Pode estar insatisfeita com CRM atual"],
  "executiveSummary": "Agência com boa presença digital.",
  "commercialDiagnosis": "Decisor ativo. Dor de gestão manual é evidente.",
  "pains": ["Gestão manual de leads", "Falta de follow-up estruturado"],
  "opportunities": ["SDR automatizado", "CRM integrado"],
  "initialMessage": "Oi! Vi o trabalho incrível da @agenciaexemplo...",
  "followUp1": "Passando para retomar nossa conversa...",
  "followUp2": "Última tentativa! Se quiser ver como automatizamos...",
  "strategy": "Diagnóstico gratuito de 15 minutos via DM",
  "closingProbability": "Alta (70%)",
  "nextAction": "Enviar mensagem inicial hoje às 18h",
  "missingInfo": ["Budget disponível", "Tamanho do time"],
  "rawInput": {},
  "rawOutput": "Análise gerada pelo Gemini Flash..."
}
```

**O webhook automaticamente:**
- Cria ou atualiza o lead (por Instagram → por companyName → novo)
- Mapeia `classification` para temperatura (`QUENTE/HOT → HOT`, `MORNO/WARM → WARM`, `FRIO/COLD → COLD`)
- Salva a análise completa
- Cria até 3 mensagens (INITIAL, FOLLOW_UP_1, FOLLOW_UP_2)
- Cria follow-up tasks: hoje (+0), +3 dias, +7 dias

---

## 🧪 Exemplos cURL

```bash
# Health check (público)
curl -s https://seu-app.onrender.com/health | jq

# Listar leads
curl -s https://seu-app.onrender.com/leads \
  -H "x-api-key: sua-chave" | jq

# Criar lead
curl -s -X POST https://seu-app.onrender.com/leads \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave" \
  -d '{"companyName":"Empresa Teste","instagram":"@teste","niche":"SaaS"}' | jq

# Follow-ups de hoje
curl -s https://seu-app.onrender.com/followups/today \
  -H "x-api-key: sua-chave" | jq

# Atualizar status do lead
curl -s -X PATCH https://seu-app.onrender.com/leads/LEAD_ID \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave" \
  -d '{"status":"CONTACTED","temperature":"HOT"}' | jq

# Webhook n8n
curl -s -X POST https://seu-app.onrender.com/webhooks/n8n/lead-analysis \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua-chave" \
  -d '{"companyName":"Empresa","instagram":"@empresa","classification":"QUENTE","initialMessage":"Oi!","followUp1":"Follow 1","followUp2":"Follow 2","nextAction":"Enviar DM"}' | jq
```

---

## 📊 Modelo de Dados

```
Lead
 ├── LeadAnalysis[]       (análises de IA)
 ├── MessageSuggestion[]  (mensagens sugeridas)
 │     └── FollowUpTask[] (tarefas vinculadas)
 └── AgentFeedback[]      (avaliações de qualidade)
```

### Fluxo de status do Lead

```
NEW → CONTACTED → RESPONDED → FOLLOW_UP_1 → FOLLOW_UP_2
                                    ↓
                          MEETING_SCHEDULED → PROPOSAL_SENT → WON
                                                         ↓
                                                       LOST / ARCHIVED
```

---

## 🛠️ Scripts

```bash
npm run dev              # Dev com hot reload
npm run build            # Compila TypeScript → dist/
npm start                # Inicia produção (node dist/server.js)
npm run prisma:generate  # Gera Prisma Client
npm run prisma:migrate   # Aplica migrations em produção
npm run prisma:migrate:dev  # Cria + aplica migrations em dev
npm run prisma:studio    # Abre GUI do banco (Prisma Studio)
npm run prisma:seed      # Popula banco com dados de exemplo
```

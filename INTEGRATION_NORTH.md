# INTEGRATION_NORTH.md

> Documentação técnica de integração entre os três projetos do ecossistema North.
> Escrita na Fase 3, a partir de auditoria direta do código-fonte real do
> `north-SDR-Back` (Fases 1 e 2 já concluídas e publicadas). Nenhum endpoint,
> campo ou enum aqui descrito é hipotético — tudo reflete o estado real do
> backend em produção no momento da escrita.

---

## 1. Visão Geral da Integração

O ecossistema North é composto por três projetos distintos, com
responsabilidades separadas:

| Projeto | Papel | Stack | Status |
|---|---|---|---|
| **north-SDR-Back** | Motor de prospecção, CRM de leads e memória/aprendizado comercial | Node.js, Fastify, Prisma, PostgreSQL (Supabase) | ✅ Em produção (Render) |
| **north-back** | Backend central do North (orquestração geral do produto) | A definir/já existente em outro projeto | 🔜 Integração na segunda-feira |
| **north-front** | Interface visual do North (dashboard, telas) | A definir/já existente em outro projeto | 🔜 Consome north-back, não consome north-SDR-Back diretamente |

**Princípio arquitetural central desta integração:**
**`north-front` nunca fala diretamente com `north-SDR-Back`.** O `north-back`
atua como *gateway* único: ele consome a API do `north-SDR-Back` usando a API
Key de servidor, processa/agrega o que for necessário, e expõe para o
`north-front` apenas o que fizer sentido para a UI. Isso preserva o
`N8N_WEBHOOK_API_KEY` (que hoje também é a chave de acesso a todas as rotas)
fora do alcance do navegador.

---

## 2. Arquitetura Final Esperada

```
┌──────────────┐        HTTPS         ┌──────────────┐        HTTPS         ┌────────────────────┐
│ north-front  │ ───────────────────▶ │  north-back  │ ───────────────────▶ │  north-SDR-Back     │
│ (browser/app)│ ◀─────────────────── │ (server-side)│ ◀─────────────────── │ (Render, produção)  │
└──────────────┘     JSON (sem        └──────────────┘   JSON + x-api-key   └────────┬────────────┘
                      API Key do                                                      │
                      SDR exposta)                                                    │ Prisma
                                                                                        ▼
                                                                              ┌────────────────────┐
                                                                              │  Supabase (Postgres)│
                                                                              └────────────────────┘

                                                              ┌──────────────┐
                                                              │     n8n      │
                                                              │ (SDR Agent)  │
                                                              └──────┬───────┘
                                                                     │ POST /webhooks/n8n/lead-analysis
                                                                     │ (x-api-key)
                                                                     ▼
                                                         [ mesma API north-SDR-Back ]
```

**Pontos importantes:**

- O `north-SDR-Back` já recebe tráfego do **n8n** (webhook de análise de
  leads) e continuará recebendo — essa integração **não muda** na Fase 3.
- O `north-back` passa a ser **mais um consumidor** da mesma API, usando os
  mesmos mecanismos de autenticação (`x-api-key`) já existentes.
- Não há necessidade de criar novos endpoints no `north-SDR-Back` para essa
  integração — os 27 endpoints existentes (Fases 1 e 2) já cobrem leads,
  análises, mensagens, follow-ups, feedbacks, outcomes e learning.

---

## 3. Fluxo de Dados

### 3.1 Fluxo de criação/atualização de lead (já em produção, via n8n)

```
Lead Information Form (n8n)
  → SDR Analysis Agent (n8n + Gemini)
  → Formatar resultado (n8n)
  → POST /webhooks/n8n/lead-analysis (north-SDR-Back)
      → cria/atualiza Lead
      → cria LeadAnalysis
      → cria até 3 MessageSuggestion (INITIAL, FOLLOW_UP_1, FOLLOW_UP_2)
      → cria FollowUpTask para cada mensagem (+0, +3, +7 dias)
      → inicializa LeadOutcome (dataPrimeiroContato, canalContato)
  → Fim do formulário (n8n)
```

### 3.2 Fluxo esperado de consumo pelo north-back (a implementar segunda-feira)

```
north-front solicita dados (ex.: "ver leads", "ver métricas")
  → north-back recebe a requisição do front
  → north-back chama north-SDR-Back com x-api-key
  → north-SDR-Back responde em JSON (envelope padronizado, ver seção 6)
  → north-back agrega/transforma se necessário
  → north-back responde ao north-front (sem expor x-api-key do SDR)
```

### 3.3 Fluxo de atualização de jornada comercial (operador usa o North)

```
Operador no north-front registra reunião/proposta/fechamento/perda
  → north-front envia ação para north-back
  → north-back chama POST /leads/:leadId/outcome/{meeting|proposal|won|lost}
  → north-SDR-Back persiste em LeadOutcome e sincroniza Lead.status
  → resposta propagada de volta ao north-front
```

---

## 4. Como o north-back Deve Consumir o north-SDR-Back

- **Toda chamada** (exceto `GET /health`) precisa do header `x-api-key`.
- O `north-back` deve manter a **mesma chave** usada pelo n8n
  (`N8N_WEBHOOK_API_KEY`), ou — recomendado para segurança — uma chave própria
  caso o backend seja evoluído futuramente para suportar múltiplas API Keys
  (não implementado hoje; hoje existe uma única chave global).
- Todas as respostas seguem o mesmo envelope (ver seção 6). O `north-back`
  deve sempre checar `success: true/false` antes de usar `data`.
- Erros de validação retornam `422` com `error: "VALIDATION_ERROR"` e um
  array `details` (saída direta do Zod) — útil para logs, não recomendado
  expor literalmente ao usuário final do `north-front`.
- Erros de autenticação retornam `401` com `error: "UNAUTHORIZED"`.
- Recurso não encontrado retorna `404` com `error: "NOT_FOUND"`.
- Conflito (ex.: Instagram duplicado) retorna `409` com `error: "CONFLICT"`.

---

## 5. Variáveis de Ambiente Necessárias no north-back

```bash
# URL base do north-SDR-Back em produção
NORTH_SDR_API_URL=https://north-sdr-n8n-back.onrender.com

# Mesma chave configurada em N8N_WEBHOOK_API_KEY no north-SDR-Back
NORTH_SDR_API_KEY=<valor da N8N_WEBHOOK_API_KEY do north-SDR-Back>
```

**Atenção:** essas variáveis devem existir **apenas no ambiente server-side**
do `north-back`. Nunca devem ser injetadas em variáveis de build do
`north-front` (ex.: `NEXT_PUBLIC_*`, `VITE_*` ou equivalente), pois isso
exporia a chave no bundle do navegador.

---

## 6. Formato Padrão de Resposta (envelope)

Toda resposta do `north-SDR-Back` segue esta forma:

```json
{
  "success": true,
  "data": { },
  "message": "Mensagem opcional",
  "meta": { "total": 10 }
}
```

Em erro:

```json
{
  "success": false,
  "message": "Descrição do erro",
  "error": "CODIGO_DO_ERRO"
}
```

`message` e `meta` são opcionais e só aparecem quando o endpoint os define.

---

## 7. Endpoints do north-SDR-Back que Serão Consumidos

> Base URL de produção: `https://north-sdr-n8n-back.onrender.com`
> Todos os endpoints abaixo, exceto `/health`, exigem o header `x-api-key`.

### 7.1 Health (público, sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/health` | Status da API, ambiente e timestamp |

### 7.2 Leads

| Método | Rota | Descrição |
|---|---|---|
| POST | `/leads` | Cria lead manualmente |
| GET | `/leads` | Lista todos os leads |
| GET | `/leads/:id` | Detalhe de um lead (inclui última análise, últimas 3 mensagens, follow-ups pendentes) |
| PATCH | `/leads/:id` | Atualiza campos do lead |
| DELETE | `/leads/:id` | Remove lead (cascade em análises, mensagens, follow-ups, feedbacks, outcome) |

### 7.3 Análises

| Método | Rota | Descrição |
|---|---|---|
| POST | `/analyses` | Cria análise vinculada a um lead |
| GET | `/analyses` | Lista todas as análises |
| GET | `/analyses/:id` | Detalhe de uma análise |
| GET | `/leads/:leadId/analyses` | Análises de um lead específico |

### 7.4 Mensagens

| Método | Rota | Descrição |
|---|---|---|
| POST | `/messages` | Cria mensagem sugerida |
| GET | `/messages` | Lista todas as mensagens |
| GET | `/leads/:leadId/messages` | Mensagens de um lead específico |
| PATCH | `/messages/:id` | Atualiza status/conteúdo da mensagem |

### 7.5 Follow-ups

| Método | Rota | Descrição |
|---|---|---|
| POST | `/followups` | Cria tarefa de follow-up |
| GET | `/followups` | Lista todos os follow-ups (atualiza PENDING vencidos para OVERDUE automaticamente) |
| GET | `/followups/today` | Follow-ups com vencimento hoje (PENDING + OVERDUE) |
| PATCH | `/followups/:id` | Atualiza status/data/notas |

### 7.6 Feedbacks (qualidade da IA — não confundir com outcome comercial)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/feedbacks` | Registra avaliação de qualidade de uma análise (rating 1-5) |
| GET | `/feedbacks` | Lista todos os feedbacks |
| GET | `/leads/:leadId/feedbacks` | Feedbacks de um lead específico |

### 7.7 Webhook (uso exclusivo do n8n — não deve ser chamado pelo north-back)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/webhooks/n8n/lead-analysis` | Endpoint consumido pelo n8n ao final da análise SDR |

### 7.8 Outcomes (jornada comercial do lead — Fase 2)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/leads/:leadId/outcome` | Estado comercial atual do lead |
| PATCH | `/leads/:leadId/outcome` | Upsert genérico de qualquer combinação de campos do outcome |
| POST | `/leads/:leadId/outcome/meeting` | Registra reunião agendada |
| POST | `/leads/:leadId/outcome/proposal` | Registra proposta enviada |
| POST | `/leads/:leadId/outcome/won` | Registra fechamento (ganho) |
| POST | `/leads/:leadId/outcome/lost` | Registra perda |

### 7.9 Learning (métricas e aprendizado — somente leitura, Fase 2)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/learning/summary` | Resumo executivo do funil |
| GET | `/learning/metrics` | Métricas detalhadas (conversão, nicho, canal, motivos de perda) |
| GET | `/learning/rankings` | Rankings (top nichos, top canais, top estratégias) |
| GET | `/learning/niches` | Detalhe de conversão por nicho |
| GET | `/learning/channels` | Detalhe de conversão por canal |
| GET | `/learning/loss-reasons` | Detalhe de motivos de perda |

Todos os endpoints `/learning/*` aceitam o query param opcional `?since=YYYY-MM-DD`
para filtrar por janela temporal (baseado em `Lead.createdAt`).

---

## 8. Headers Obrigatórios

```
Content-Type: application/json
x-api-key: <NORTH_SDR_API_KEY>
```

Sem `x-api-key` válido, qualquer rota (exceto `/health`) retorna:

```json
{
  "success": false,
  "message": "API Key inválida ou ausente. Envie o header x-api-key.",
  "error": "UNAUTHORIZED"
}
```
Status HTTP: `401`.

---

## 9. Exemplos de Requests e Responses

### 9.1 Buscar leads

**Request**
```http
GET /leads HTTP/1.1
Host: north-sdr-n8n-back.onrender.com
x-api-key: <NORTH_SDR_API_KEY>
```

**Response — 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "clx1a2b3c4d5e6f7g8h9",
      "companyName": "Agência Exemplo",
      "instagram": "@agenciaexemplo",
      "website": "https://agenciaexemplo.com.br",
      "niche": "Marketing Digital",
      "preferredChannel": "Instagram",
      "source": "n8n",
      "notes": null,
      "status": "CONTACTED",
      "temperature": "HOT",
      "score": 0,
      "createdAt": "2026-06-15T14:32:00.000Z",
      "updatedAt": "2026-06-18T09:10:00.000Z",
      "_count": { "analyses": 1, "messages": 3, "followups": 3 }
    }
  ],
  "meta": { "total": 1 }
}
```

### 9.2 Buscar um lead específico (detalhado)

**Request**
```http
GET /leads/clx1a2b3c4d5e6f7g8h9 HTTP/1.1
x-api-key: <NORTH_SDR_API_KEY>
```

**Response — 200**
```json
{
  "success": true,
  "data": {
    "id": "clx1a2b3c4d5e6f7g8h9",
    "companyName": "Agência Exemplo",
    "instagram": "@agenciaexemplo",
    "status": "CONTACTED",
    "temperature": "HOT",
    "analyses": [ { "id": "...", "classification": "QUENTE", "...": "..." } ],
    "messages": [ { "id": "...", "type": "INITIAL", "...": "..." } ],
    "followups": [ { "id": "...", "status": "PENDING", "dueDate": "2026-06-21T09:00:00.000Z" } ],
    "_count": { "analyses": 1, "messages": 3, "followups": 3, "feedbacks": 0 }
  }
}
```

### 9.3 Buscar métricas

**Request**
```http
GET /learning/metrics?since=2026-01-01 HTTP/1.1
x-api-key: <NORTH_SDR_API_KEY>
```

**Response — 200**
```json
{
  "success": true,
  "data": {
    "taxaConversaoGeral": 32.5,
    "taxaRespostaGeral": 58.3,
    "ticketMedio": 4200.0,
    "tempoMedioFechamentoDias": 9.4,
    "conversaoPorNicho": [
      {
        "niche": "Marketing Digital",
        "totalLeads": 20,
        "fechamentos": 7,
        "perdas": 5,
        "taxaConversao": 58.33,
        "faturamento": 29400.0
      }
    ],
    "conversaoPorCanal": [
      {
        "canal": "INSTAGRAM",
        "totalLeads": 15,
        "taxaResposta": 60.0,
        "taxaConversao": 40.0
      }
    ],
    "motivosPerdaFrequentes": [
      { "motivo": "SEM_VERBA", "total": 3, "percentual": 60.0 }
    ]
  }
}
```

### 9.4 Buscar rankings

**Request**
```http
GET /learning/rankings HTTP/1.1
x-api-key: <NORTH_SDR_API_KEY>
```

**Response — 200**
```json
{
  "success": true,
  "data": {
    "topNichosPorConversao": [ { "niche": "Marketing Digital", "taxaConversao": 58.33 } ],
    "topNichosPorFaturamento": [ { "niche": "Marketing Digital", "faturamento": 29400.0 } ],
    "topNichosPorFechamentos": [ { "niche": "Marketing Digital", "fechamentos": 7 } ],
    "topCanaisPorConversao": [ { "canal": "INSTAGRAM", "taxaConversao": 40.0 } ],
    "topCanaisPorResposta": [ { "canal": "WHATSAPP", "taxaResposta": 75.0 } ],
    "topEstrategiasPorResultado": [
      { "estrategia": "Diagnóstico gratuito via DM", "totalUsos": 12, "fechamentos": 5, "taxaConversao": 41.67 }
    ],
    "_debug": { "totalAnalisesComEstrategiaEFechamento": 5 }
  }
}
```

> **Nota técnica:** o campo `_debug` é retornado de fato pelo backend hoje
> (uso interno de depuração deixado no código da Fase 2). O `north-back` pode
> ignorá-lo ao montar a resposta para o `north-front` — não é destinado à UI.

### 9.5 Registrar reunião

**Request**
```http
POST /leads/clx1a2b3c4d5e6f7g8h9/outcome/meeting HTTP/1.1
Content-Type: application/json
x-api-key: <NORTH_SDR_API_KEY>

{
  "canalContato": "WHATSAPP",
  "observacoes": "Reunião marcada para quinta às 15h"
}
```
Campo `dataReuniao` é opcional — se omitido, assume o momento atual do servidor.

**Response — 201**
```json
{
  "success": true,
  "data": {
    "id": "outc_abc123",
    "leadId": "clx1a2b3c4d5e6f7g8h9",
    "status": "MEETING_SCHEDULED",
    "dataReuniao": "2026-06-19T18:40:00.000Z",
    "canalContato": "WHATSAPP",
    "observacoes": "Reunião marcada para quinta às 15h"
  },
  "message": "Reunião registrada com sucesso"
}
```

### 9.6 Registrar proposta

**Request**
```http
POST /leads/clx1a2b3c4d5e6f7g8h9/outcome/proposal HTTP/1.1
Content-Type: application/json
x-api-key: <NORTH_SDR_API_KEY>

{
  "valorProposta": 4500.00,
  "observacoes": "Proposta para pacote anual"
}
```
`valorProposta` é **obrigatório**. `dataProposta` é opcional (default: agora).

**Response — 201**
```json
{
  "success": true,
  "data": {
    "id": "outc_abc123",
    "status": "PROPOSAL_SENT",
    "valorProposta": "4500",
    "dataProposta": "2026-06-19T18:42:00.000Z"
  },
  "message": "Proposta registrada com sucesso"
}
```

### 9.7 Registrar ganho (won)

**Request**
```http
POST /leads/clx1a2b3c4d5e6f7g8h9/outcome/won HTTP/1.1
Content-Type: application/json
x-api-key: <NORTH_SDR_API_KEY>

{
  "valorFechado": 4200.00,
  "observacoes": "Fechado com desconto de 300"
}
```
`valorFechado` é **obrigatório**. `dataFechamento` é opcional (default: agora).
Ao registrar ganho, `lossReason` é automaticamente limpo (`null`).

**Response — 201**
```json
{
  "success": true,
  "data": {
    "id": "outc_abc123",
    "status": "WON",
    "valorFechado": "4200",
    "dataFechamento": "2026-06-19T18:44:00.000Z",
    "lossReason": null
  },
  "message": "Fechamento registrado com sucesso"
}
```

### 9.8 Registrar perda (lost)

**Request**
```http
POST /leads/clx1a2b3c4d5e6f7g8h9/outcome/lost HTTP/1.1
Content-Type: application/json
x-api-key: <NORTH_SDR_API_KEY>

{
  "lossReason": "SEM_VERBA",
  "observacoes": "Cliente adiou decisão para o próximo trimestre"
}
```
`lossReason` é **obrigatório** e deve ser um dos valores:
`SEM_VERBA | SEM_INTERESSE | JA_POSSUI_SISTEMA | SEM_RESPOSTA | ADIADO | OUTRO`.

**Response — 201**
```json
{
  "success": true,
  "data": {
    "id": "outc_abc123",
    "status": "LOST",
    "lossReason": "SEM_VERBA",
    "dataFechamento": "2026-06-19T18:46:00.000Z"
  },
  "message": "Perda registrada com sucesso"
}
```

### 9.9 Atualizar outcome (upsert genérico)

Use quando precisar setar múltiplos campos de uma vez, fora dos atalhos
acima (ex.: corrigir uma data retroativamente).

**Request**
```http
PATCH /leads/clx1a2b3c4d5e6f7g8h9/outcome HTTP/1.1
Content-Type: application/json
x-api-key: <NORTH_SDR_API_KEY>

{
  "dataResposta": "2026-06-16T10:00:00.000Z",
  "canalContato": "INSTAGRAM"
}
```

**Response — 200**
```json
{
  "success": true,
  "data": {
    "id": "outc_abc123",
    "dataResposta": "2026-06-16T10:00:00.000Z",
    "canalContato": "INSTAGRAM"
  },
  "message": "Outcome atualizado com sucesso"
}
```

> Se o body incluir `status`, o `Lead.status` correspondente também é
> sincronizado automaticamente pelo backend.

---

## 10. Como o north-front Deve Exibir Esses Dados (Futuro)

Esta seção é **orientativa para quando a integração visual for desenhada** —
não há nenhuma implementação de UI nesta fase.

- **Lista de leads:** usar `GET /leads` (via north-back) para tabela
  principal, com colunas sugeridas: `companyName`, `status`, `temperature`,
  `niche`, `createdAt`. O campo `_count` já vem pronto para badges
  ("3 mensagens", "2 follow-ups pendentes").
- **Detalhe do lead:** usar `GET /leads/:id` para a tela de detalhe — já
  retorna análise mais recente, últimas mensagens e follow-ups pendentes em
  uma única chamada, evitando múltiplos round-trips.
- **Painel de outcome do lead:** usar `GET /leads/:leadId/outcome` para
  exibir o estágio comercial atual (reunião marcada, proposta enviada,
  valores, datas). Os botões de ação (Registrar Reunião / Proposta / Ganho /
  Perda) devem mapear 1:1 para os 4 endpoints de atalho da seção 7.8 — não
  reimplementar a lógica de transição de status no frontend.
- **Dashboard de métricas:** usar `GET /learning/summary` para os cards de
  topo (total de leads, conversão geral, faturamento, ticket médio) e
  `GET /learning/metrics` para gráficos de conversão por nicho/canal.
- **Rankings:** usar `GET /learning/rankings` para os blocos "Top Nichos",
  "Top Canais", "Top Estratégias" — ignorar o campo `_debug` na exibição.
- **Filtro temporal:** todos os endpoints `/learning/*` aceitam `?since=`;
  recomenda-se que o `north-front` exponha um seletor de período (ex.: "Este
  mês", "Últimos 90 dias") que o `north-back` traduz para essa query string.

---

## 11. Checklist de Integração para Segunda-Feira

### Preparação (north-back)
- [ ] Definir as duas variáveis de ambiente (seção 5) no ambiente do `north-back`.
- [ ] Implementar um client HTTP simples (fetch/axios) com `x-api-key` fixo no header.
- [ ] Implementar tratamento de erro padrão lendo `success`, `error`, `message` do envelope.
- [ ] Validar conectividade com `GET /health` (não exige API Key).

### Leads
- [ ] Endpoint proxy/wrapper para `GET /leads` (listagem).
- [ ] Endpoint proxy/wrapper para `GET /leads/:id` (detalhe).
- [ ] Decidir se `POST /leads` (criação manual) será exposto no North ou se
      a criação continua exclusiva do n8n.

### Outcomes
- [ ] Endpoint proxy/wrapper para `GET /leads/:leadId/outcome`.
- [ ] Endpoint proxy/wrapper para os 4 atalhos (`meeting`, `proposal`, `won`, `lost`).
- [ ] Validar no `north-back` que `valorProposta`/`valorFechado` chegam como
      número (não string) antes de repassar — o Zod do SDR aceita `number`.

### Learning
- [ ] Endpoint proxy/wrapper para `GET /learning/summary`.
- [ ] Endpoint proxy/wrapper para `GET /learning/metrics`.
- [ ] Endpoint proxy/wrapper para `GET /learning/rankings`.
- [ ] Decidir se `?since=` será controlado pelo `north-front` ou fixo no `north-back`.

### Testes de integração
- [ ] Teste manual: `GET /health` sem header → deve responder 200 (rota pública).
- [ ] Teste manual: `GET /leads` sem `x-api-key` → deve responder 401.
- [ ] Teste manual: `GET /leads` com `x-api-key` correta → deve responder 200 com array.
- [ ] Teste manual: criar um outcome de teste (`meeting` → `proposal` → `won`)
      em um lead existente e confirmar reflexo em `GET /learning/summary`.

### Segurança
- [ ] Confirmar que `NORTH_SDR_API_KEY` **não** está em nenhuma variável
      `NEXT_PUBLIC_*`/`VITE_*`/equivalente do `north-front`.
- [ ] Revisar `SECURITY_NOTES.md` do `north-SDR-Back` (alerta de RLS
      desabilitado no Supabase) antes de decidir se o `north-front` terá
      algum acesso direto ao Supabase no futuro — hoje não tem, e este
      documento assume que essa premissa se mantém.

---

## 12. Fora de Escopo desta Fase

Para deixar claro o que **não** foi feito nesta etapa (Fase 3), por decisão
explícita:

- Nenhum código do `north-back` foi criado ou alterado.
- Nenhum código do `north-front` foi criado.
- Nenhuma alteração foi feita no `north-SDR-Back` (Fases 1 e 2 permanecem
  intactas).
- Nenhuma alteração foi feita no workflow do n8n.
- Nenhuma alteração foi feita no Supabase (schema, RLS, policies).
- Nenhuma chave de API nova foi gerada — a integração assume reuso da
  `N8N_WEBHOOK_API_KEY` existente até que uma decisão de múltiplas chaves
  seja tomada.
# PHASES.md

> Roadmap técnico do `north-SDR-Back`. Documenta o que foi efetivamente
> implementado, validado e publicado em cada fase, e o que está planejado
> para as fases seguintes. Escrito na Fase 3, a partir de auditoria direta
> do código-fonte real — nenhuma entrega aqui descrita é hipotética.

---

## Fase 1 — Infraestrutura SDR ✅ Concluída

### Objetivo
Construir o backend que serve de memória persistente para o North SDR Agent
(hoje rodando no n8n), recebendo as análises geradas pelo agente e
armazenando leads, análises, mensagens sugeridas e tarefas de follow-up.

### Status
**Concluída e publicada em produção.**

### O que já foi feito
- Backend Node.js + TypeScript (strict) + Fastify criado do zero.
- Banco de dados PostgreSQL via Supabase, com schema Prisma cobrindo 5 modelos
  centrais: `Lead`, `LeadAnalysis`, `MessageSuggestion`, `FollowUpTask`,
  `AgentFeedback`.
- 7 enums modelando o domínio: `LeadStatus`, `LeadTemperature`, `MessageType`,
  `MessageChannel`, `MessageStatus`, `FollowUpStatus`, `FeedbackProblemType`.
- Autenticação por API Key (`x-api-key` contra `N8N_WEBHOOK_API_KEY`),
  aplicada globalmente via `addHook` em todas as rotas exceto `GET /health`.
- Validação de entrada com Zod em todos os endpoints.
- Plugins de segurança: `@fastify/cors`, `@fastify/helmet`,
  `@fastify/rate-limit` (100 req/min por IP).
- Tratamento de erro global padronizado (`success`/`error`/`message`/`meta`).
- 21 endpoints REST implementados, cobrindo os módulos:
  `health`, `leads`, `analyses`, `messages`, `followups`, `feedbacks`,
  `webhooks`.
- Endpoint `POST /webhooks/n8n/lead-analysis` consumido pelo n8n ao final do
  fluxo `Lead Information Form → SDR Analysis Agent → Formatar resultado`.
- Lógica de resolução de lead sem duplicidade no webhook: busca por
  `instagram` (campo único) e, na ausência dele, por `companyName`
  normalizado (sem acentos/pontuação) antes de criar um novo registro.
- Mapeamento automático de `classification` (texto livre do agente, em
  português ou inglês) para o enum `LeadTemperature`
  (`QUENTE/HOT → HOT`, `MORNO/WARM → WARM`, `FRIO/COLD → COLD`, demais →
  `UNKNOWN`).
- Criação automática de até 3 `FollowUpTask` por análise recebida, com prazos
  diferenciados: mensagem inicial (+0 dias), follow-up 1 (+3 dias), follow-up
  2 (+7 dias).
- Deploy publicado no Render (`https://north-sdr-n8n-back.onrender.com`),
  com build automatizado via `render.yaml`
  (`npm install && npx prisma generate && npm run build && npx prisma migrate deploy`).
- Migration inicial aplicada diretamente no Supabase de produção, criando as
  5 tabelas (`leads`, `lead_analyses`, `message_suggestions`,
  `follow_up_tasks`, `agent_feedbacks`) com índices de performance e
  triggers de `updatedAt`.
- `Dockerfile` multi-stage corrigido (engine Prisma gerado apenas no estágio
  de build, não no runtime) — uso opcional, já que o deploy principal é via
  Render Node Environment.
- Documentação inicial (`README.md`) com instruções de setup local, deploy e
  exemplos de uso via `curl`.

### O que falta
Nada pendente nesta fase — todos os itens propostos foram entregues e
validados (build TypeScript limpo, schema Prisma validado, migration
confirmada no banco real via Supabase MCP).

### Próximos passos
Nenhum — fase encerrada. Manutenção evolutiva ocorre nas fases seguintes.

---

## Fase 2 — Memória e Aprendizado ✅ Concluída

### Objetivo
Evoluir o backend de um simples CRM de leads para um sistema que aprende com
resultados comerciais reais (reuniões, propostas, fechamentos, perdas),
permitindo cálculo de métricas e rankings baseados em dados históricos —
sem qualquer aprendizado artificial do modelo de IA, apenas inteligência
derivada do banco de dados.

### Status
**Concluída e publicada em produção** (migration aplicada no Supabase real,
build TypeScript validado, código publicado no Render).

### O que já foi feito
- Auditoria do schema, tabelas, rotas, módulos e webhook existentes antes de
  qualquer alteração — decisão técnica de **não** sobrecarregar a tabela
  `agent_feedbacks` (que mede qualidade da IA, não jornada comercial) e
  **criar uma tabela nova** (`lead_outcomes`) para preservar compatibilidade
  total com a Fase 1.
- Novo enum `LossReason` (`SEM_VERBA`, `SEM_INTERESSE`,
  `JA_POSSUI_SISTEMA`, `SEM_RESPOSTA`, `ADIADO`, `OUTRO`).
- Novo modelo `LeadOutcome`, com relação 1:1 com `Lead`, armazenando:
  `status` (espelha `LeadStatus`), `lossReason`, `valorProposta`,
  `valorFechado`, `canalContato`, `dataPrimeiroContato`, `dataResposta`,
  `dataReuniao`, `dataProposta`, `dataFechamento`, `observacoes`.
- 4 índices de performance em `lead_outcomes`
  (`status`, `lossReason`, `canalContato`, `dataFechamento`).
- Migration `20260619213439_add_lead_outcomes_learning` criada e aplicada
  diretamente no Supabase de produção via MCP, com trigger de `updatedAt`
  seguindo o mesmo padrão das tabelas da Fase 1.
- Novo módulo `outcomes` (schema + service + route), com 6 endpoints:
  consulta de outcome, upsert genérico, e 4 atalhos de transição de funil
  (`meeting`, `proposal`, `won`, `lost`) — cada atalho sincroniza
  automaticamente `Lead.status`.
- Novo módulo `learning` (schema + service + route, somente leitura), com 6
  endpoints: `summary`, `metrics`, `rankings`, `niches`, `channels`,
  `loss-reasons` — todos aceitando filtro opcional `?since=`.
- Métricas calculadas em runtime (sem pré-agregação): taxa de conversão
  geral, taxa de resposta, ticket médio, tempo médio de fechamento,
  conversão por nicho, conversão e resposta por canal, motivos de perda mais
  frequentes.
- Rankings automáticos: top nichos por conversão/faturamento/fechamentos, top
  canais por conversão/resposta, top estratégias por resultado (cruzando
  `LeadAnalysis.strategy` com outcomes `WON`).
- Correção pontual no `webhooks.service.ts`: ao processar cada análise
  recebida do n8n, o backend agora também inicializa/atualiza o
  `LeadOutcome` correspondente, populando `dataPrimeiroContato` (apenas na
  criação, nunca sobrescrita) e `canalContato` (sempre atualizado com o
  canal mais recente informado).
- Registro das duas novas rotas (`outcomesRoutes`, `learningRoutes`) no bloco
  protegido por API Key do `app.ts` — nenhuma rota nova ficou pública.
- Validação completa: `npx prisma generate`, `npx prisma validate`,
  `npm run build` (tsc) e `tsc --noEmit`, todos com saída limpa.
- Auditoria de segurança do Supabase via MCP, identificando RLS desabilitado
  em todas as 7 tabelas do schema público — documentado em
  `SECURITY_NOTES.md`, sem aplicação automática de correção (decisão
  pendente do responsável pelo projeto).

### O que falta
- Decisão sobre ativação de RLS no Supabase (alerta documentado, nenhuma
  ação tomada).
- `LeadAnalysis.strategy` é texto livre gerado pelo agente — o ranking de
  "top estratégias por resultado" tende a diluir com variações de texto
  semanticamente equivalentes. Nenhuma normalização foi implementada.

### Próximos passos
Nenhum item de código pendente nesta fase. Os dois pontos acima são decisões
de produto/segurança, não bugs ou lacunas técnicas, e ficam registrados para
quando o responsável pelo projeto decidir endereçá-los.

---

## Fase 3 — Preparação da Integração com North 🔄 Atual

### Objetivo
Preparar toda a documentação técnica e arquitetural necessária para que a
integração entre `north-front`, `north-back` e `north-SDR-Back` possa ser
realizada rapidamente na segunda-feira, **sem tocar em nenhum código
funcional** das fases anteriores nem nos sistemas externos (n8n, Supabase).

### Status
**Em andamento — escopo restrito a documentação.**

### O que já foi feito
- Auditoria completa do código real do `north-SDR-Back` para extrair, sem
  inferência: todos os 27 endpoints existentes, seus métodos HTTP, payloads
  Zod exatos, formato de resposta (`success`/`data`/`message`/`meta`),
  comportamento de autenticação (`x-api-key`), e variáveis de ambiente
  reais (`DATABASE_URL`, `DIRECT_URL`, `PORT`, `NODE_ENV`, `CORS_ORIGIN`,
  `N8N_WEBHOOK_API_KEY`).
- Criação de `INTEGRATION_NORTH.md`: documento técnico descrevendo a
  arquitetura de integração (north-front → north-back → north-SDR-Back),
  fluxo de dados, todos os endpoints reais com exemplos de request/response
  extraídos do código, headers obrigatórios, variáveis de ambiente
  necessárias no `north-back`, e checklist de integração para segunda-feira.
- Criação deste arquivo (`PHASES.md`), documentando o roadmap completo do
  projeto.

### O que falta
- Nenhuma implementação de código é esperada nesta fase — por definição de
  escopo, ela termina quando a documentação estiver completa e revisada.
- A integração de fato (código no `north-back` consumindo o
  `north-SDR-Back`) está fora do escopo da Fase 3 e ocorrerá na
  segunda-feira, quando o projeto North estiver disponível novamente.

### Próximos passos
1. Revisar `INTEGRATION_NORTH.md` e `PHASES.md` antes de segunda-feira.
2. Na segunda-feira, seguir o checklist de integração (seção 11 de
   `INTEGRATION_NORTH.md`) para implementar o consumo da API no
   `north-back`.
3. Validar manualmente os fluxos críticos (listagem de leads, registro de
   outcome, leitura de métricas) antes de conectar a UI do `north-front`.

---

## Fase 4 — Inteligência Baseada em Histórico 🔮 Futura

### Objetivo
Usar os dados acumulados pela Fase 2 (`LeadOutcome`, métricas, rankings) para
que o próprio agente SDR (rodando no n8n) **consulte** o histórico antes de
gerar uma nova análise — por exemplo, priorizando estratégias com maior taxa
de conversão para o nicho do lead em questão, ou ajustando o tom da
abordagem com base no canal com melhor taxa de resposta histórica.

### Status
**Não iniciada.** Nenhum código, endpoint ou integração desta fase existe
hoje no projeto.

### O que já foi feito
Nada ainda — os endpoints `/learning/*` da Fase 2 já expõem os dados
necessários (rankings, métricas por nicho/canal), mas **nenhuma integração**
foi feita entre esses endpoints e o workflow do n8n. Hoje o fluxo do n8n é
estritamente unidirecional: gera análise → envia para o backend. Não há
nenhuma chamada de volta do n8n para `/learning/*`.

### O que falta
- Definir como o n8n consultaria os endpoints de aprendizado (provavelmente
  um novo node HTTP Request antes do `SDR Analysis Agent`, buscando
  `/learning/rankings` ou `/learning/niches` filtrado pelo nicho do lead
  atual).
- Definir como esse contexto histórico seria injetado no prompt do agente
  (Gemini) sem comprometer o layout/fluxo visual já aprovado do formulário.
- Avaliar se é necessário um endpoint novo e mais específico (ex.:
  `GET /learning/niches/:niche`) em vez de filtrar no n8n a resposta de
  `/learning/niches`.

### Próximos passos
Esta fase só deve ser iniciada após a Fase 3 (integração com North) estar
concluída e estável, para evitar mudanças concorrentes no mesmo backend.

---

## Fase 5 — Automação Assistida de Canais 🔮 Futura

### Objetivo
Permitir que mensagens sugeridas (`MessageSuggestion`) gerados pelo SDR Agent
possam futuramente ser enviadas de forma assistida (não totalmente
automática) através de canais reais — WhatsApp e Instagram — em vez de
apenas ficarem registradas como rascunho (`DRAFT`) para envio manual, como
funciona hoje.

### Status
**Não iniciada.** Nenhuma integração com WhatsApp ou Instagram existe no
projeto atual.

### O que já foi feito
A Fase 1 já modela `MessageSuggestion.channel` com os valores `INSTAGRAM`,
`WHATSAPP`, `LINKEDIN`, `EMAIL`, `OTHER`, e `MessageSuggestion.status` com
`DRAFT`, `USED`, `SENT`, `RESPONDED`, `IGNORED` — ou seja, o **modelo de
dados já contempla** o ciclo de vida de uma mensagem enviada por canal, mas
**nenhum envio automatizado foi implementado**. Hoje a transição de status
dessas mensagens é manual, via `PATCH /messages/:id`.

### O que falta
- Toda a integração técnica com APIs de WhatsApp Business e Instagram
  (Graph API ou similar) — não iniciada.
- Definição de fluxo de aprovação humana antes do envio (a palavra
  "assistida" no nome da fase implica que não deve haver envio 100%
  automático sem revisão).
- Tratamento de respostas recebidas dos canais (webhook de entrada),
  hoje inexistente.
- Política de rate limit e janela de atendimento por canal, especialmente
  relevante para WhatsApp Business API.

### Próximos passos
Fase mais distante no roadmap. Depende da conclusão das Fases 3 e 4, e de
decisão de produto sobre qual canal priorizar primeiro (WhatsApp ou
Instagram).

---

## Resumo de Status

| Fase | Nome | Status |
|---|---|---|
| 1 | Infraestrutura SDR | ✅ Concluída |
| 2 | Memória e Aprendizado | ✅ Concluída |
| 3 | Preparação da Integração com North | 🔄 Em andamento (documentação) |
| 4 | Inteligência Baseada em Histórico | 🔮 Não iniciada |
| 5 | Automação Assistida de Canais | 🔮 Não iniciada |
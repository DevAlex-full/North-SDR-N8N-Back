# Security Notes — North SDR Backend

Documento de alertas de segurança identificados durante a Fase 2 (Memória e
Aprendizado). Nenhuma das ações de remediação abaixo foi aplicada
automaticamente — todas exigem decisão explícita do responsável pelo projeto.

---

## 🔴 CRÍTICO — Row Level Security (RLS) desabilitado

**Identificado em:** auditoria via Supabase MCP (`list_tables`), Fase 2.

**Tabelas afetadas (todas as 7 do schema público):**

- `public.leads`
- `public.lead_analyses`
- `public.message_suggestions`
- `public.follow_up_tasks`
- `public.agent_feedbacks`
- `public.lead_outcomes` (criada na Fase 2)
- `public._prisma_migrations`

**O que isso significa:**

O Supabase expõe automaticamente uma API REST/Realtime sobre todas as tabelas
do schema `public` para os roles `anon` e `authenticated`. Com RLS
desabilitado, **qualquer pessoa de posse da chave `anon` do projeto** (uma
chave pública, frequentemente embutida em frontends) consegue ler e escrever
diretamente nessas tabelas via API do Supabase, **contornando completamente**:

- a API key do backend (`N8N_WEBHOOK_API_KEY`);
- a lógica de validação Zod;
- as regras de negócio dos services (ex.: normalização de lead, upsert sem
  duplicidade, sincronização de status).

**Por que isso não quebrou nada até agora:**

O backend Fastify conecta ao Postgres via `DATABASE_URL`/`DIRECT_URL`
(conexão direta de banco, papel `postgres`), não via client Supabase REST.
Portanto a aplicação atual funciona normalmente independente do estado do
RLS. O risco é exclusivamente de **exposição externa via API pública do
Supabase**, não de mau funcionamento do backend.

**Risco real hoje:** baixo a médio — depende de a `anon key` do projeto
`bfxgbwnjofnzjdmdluju` já ter sido usada em algum client-side (app, site,
script de teste). Se nunca foi exposta publicamente, o risco prático é baixo.
Se já foi colada em algum frontend, repositório público, ou ferramenta de
terceiros, o risco é alto e imediato.

**Recomendação:**

Ativar RLS em todas as tabelas **assim que houver tempo para definir
policies**, já que ativar sem policies bloqueia 100% do acesso via API
Supabase (inclusive para os clients legítimos que vierem a existir, como o
North CRM). SQL de ativação (sem policies — vai bloquear acesso até que
policies sejam criadas):

```sql
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_outcomes ENABLE ROW LEVEL SECURITY;
```

Como o backend usa conexão direta (não API REST do Supabase), ativar RLS
**não quebra o backend atual** mesmo sem policies — só passa a bloquear
acesso via `anon`/`authenticated` (que hoje está liberado).

---

## 🟡 Recomendação para a futura integração com o North

Quando o North CRM passar a consumir o Supabase **diretamente via client
JS/REST** (em vez de só através deste backend), os seguintes pontos se tornam
obrigatórios antes do go-live dessa integração:

1. **RLS ativo + policies por tabela**, no mínimo:
   - Leitura/escrita restrita ao usuário autenticado dono dos dados (se o
     North introduzir multi-tenant/multi-usuário), ou
   - Bloqueio total de `anon`/`authenticated` e acesso exclusivo via
     `service_role` (mantendo o padrão atual de "só backend acessa").
2. **Nunca expor a `service_role key`** no client do North — ela ignora RLS
   por completo. Uso restrito a backend/serverless functions.
3. Se o North precisar de acesso real-time (Supabase Realtime/subscriptions),
   isso só é seguro com RLS configurado, pois Realtime respeita as mesmas
   policies de RLS.
4. Reavaliar se `lead_outcomes` (dados comerciais sensíveis: valores de
   proposta/fechamento) deve ter policy mais restritiva que as demais tabelas
   operacionais, já que carrega informação financeira do negócio.

---

## Estado atual (no momento deste documento)

- RLS: **desabilitado** em todas as tabelas.
- Policies: **nenhuma** criada.
- Acesso ao banco: **exclusivamente via backend** (`DATABASE_URL` direto),
  nenhum client-side Supabase em produção até o momento desta auditoria.
- Ação pendente: decisão do responsável pelo projeto sobre quando ativar RLS.
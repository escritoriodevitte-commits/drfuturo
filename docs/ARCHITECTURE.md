# drfuturo — Documento de Arquitetura Técnica

> Este documento funde a visão arquitetural original do engenheiro (Painel Jurídico Inteligente) com as decisões técnicas implementadas no drfuturo v1.0, e mapeia o caminho de evolução para v2.0 e v3.0.

## 1. Contexto

O drfuturo é a evolução do projeto "Painel Jurídico Inteligente" originalmente arquitetado em NestJS + Python + Pinecone + Playwright. Após análise técnica, identificamos que essa stack:

- ❌ Não roda bem em Vercel serverless (NestJS + Python)
- ❌ Exige 6 serviços gerenciados (Postgres, Pinecone, S3, Redis, BullMQ, Python worker)
- ❌ Usa OpenAI (custo + dependência de fornecedor)
- ❌ Tem Playwright local (Vercel não suporta headless browsers)
- ❌ Usa Pages Router (Next.js 16 default é App Router)

A versão **drfuturo v1.0** consolida tudo em um app estático que cumpre 90% da visão original com 0% da complexidade operacional.

## 2. Decisões Arquiteturais (ADRs)

### ADR-01: App estático em vez de Next.js para v1.0

**Status**: Aceito
**Contexto**: Falhas repetidas de deploy na Vercel com Next.js (build, Prisma, env vars).
**Decisão**: v1.0 é HTML/CSS/JS puro servido como estático.
**Consequências**:
- ✅ Deploy em 30s, sem build
- ✅ Zero custo de infraestrutura
- ✅ Funciona em qualquer hospedagem
- ❌ Chave API fica no navegador (aceitável para single-user)
- ❌ Sem sync entre dispositivos (aceitável para MVP)
**Revisão**: v2.0 migra para Next.js quando precisar de multi-usuário.

### ADR-02: Z.AI GLM 5.2 em vez de OpenAI

**Status**: Aceito
**Contexto**: Usuário já possui chave Z.AI. GLM 5.2 tem qualidade comparável ao GPT-4o com custo menor.
**Decisão**: Usar Z.AI como provedor de IA.
**Consequências**:
- ✅ Custo-benefício melhor
- ✅ Suporte a português brasileiro
- ✅ Web search integrada
- ❌ Vendor lock-in (mitigado por abstração no `callGLM`)
**Revisão**: v2.0 deve suportar OpenAI/Anthropic como fallback.

### ADR-03: API DataJud CNJ em vez de scraping

**Status**: Aceito
**Contexto**: Engenheiro propôs Playwright + 2Captcha + proxies. Vercel não suporta Playwright.
**Decisão**: Usar API DataJud oficial do CNJ (gratuita).
**Consequências**:
- ✅ Sem captcha, sem proxy, sem 2Captcha
- ✅ Oficial — não viola ToS de tribunais
- ✅ Funciona em serverless
- ❌ Não retorna PDFs integrais (apenas metadados)
- ❌ Alguns tribunais ainda não aderiram ao SNIJ
**Revisão**: Para PDFs integrais, v2.0 oferece Browserless cloud como opcional.

### ADR-04: RAG via context window em vez de Pinecone

**Status**: Aceito
**Contexto**: Pinecone exige conta paga + embeddings separados. MVP não precisa de multi-documento.
**Decisão**: RAG implementado via prompt com documento no context window do GLM.
**Consequências**:
- ✅ Zero infraestrutura vetorial
- ✅ Funciona offline (depois da chamada inicial)
- ✅ Latência mínima (sem round-trip para Pinecone)
- ❌ Limite de ~120k tokens por documento (suficiente para petições/sentenças)
- ❌ Não busca em múltiplos documentos simultaneamente
**Revisão**: v2.0 implementa pgvector no Neon para RAG multi-documento.

### ADR-05: localStorage em vez de Postgres

**Status**: Aceito para v1.0
**Contexto**: MVP é single-user. Não justifica subir Postgres.
**Decisão**: Toda persistência em localStorage do navegador.
**Consequências**:
- ✅ Zero configuração
- ✅ Performance máxima (sem rede)
- ✅ Privacidade total (dados não saem do browser)
- ❌ Sem sync entre dispositivos
- ❌ Limite ~5-10MB por origem
- ❌ Perda de dados se limpar cache
**Revisão**: v2.0 usa Postgres (Neon) + NextAuth para sync.

### ADR-06: Sem auth na v1.0

**Status**: Aceito
**Contexto**: Single-user mode é suficiente para MVP.
**Decisão**: Não implementar login. Chave Z.AI identifica indiretamente o usuário.
**Consequências**:
- ✅ Fricção zero no onboarding
- ✅ Sem gestão de sessão
- ❌ Não suporta escritórios com múltiplos advogados
- ❌ Não tem auditoria por usuário
**Revisão**: v2.0 implementa NextAuth com magic link.

## 3. Schema de dados (v2.0 — planejado)

Quando migrar para Postgres, usar este schema baseado no modelo do engenheiro, estendido:

```sql
-- Estendido do schema do engenheiro
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  oab VARCHAR(50),
  role VARCHAR(50) DEFAULT 'lawyer',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lawsuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  process_number VARCHAR(50) UNIQUE NOT NULL,
  court VARCHAR(100),
  area VARCHAR(50),
  status VARCHAR(100),
  judge_name VARCHAR(255),
  plaintiff VARCHAR(255),
  defendant VARCHAR(255),
  distribution_date DATE,
  value_claimed DECIMAL(15, 2),
  last_sync TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawsuit_id UUID REFERENCES lawsuits(id) ON DELETE CASCADE,
  analysis_type VARCHAR(50), -- 'risk', 'thesis', 'strategy'
  content TEXT,
  risk_level VARCHAR(20),
  confidence_score FLOAT,
  sources JSONB, -- { web: [], local: [] }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lawsuit_id UUID REFERENCES lawsuits(id),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255),
  content TEXT,
  document_type VARCHAR(50),
  embedding VECTOR(1536), -- pgvector
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'Nova conversa',
  mode VARCHAR(20) DEFAULT 'CHAT',
  case_id UUID REFERENCES lawsuits(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  sources JSONB,
  tokens_used INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pieces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES lawsuits(id),
  title VARCHAR(255),
  piece_type VARCHAR(100),
  content TEXT,
  jurisprudence JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hearing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES lawsuits(id),
  type VARCHAR(50),
  title VARCHAR(255),
  facts TEXT,
  thesis TEXT,
  mp_theses TEXT[],
  notes JSONB,
  status VARCHAR(20) DEFAULT 'live',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100),
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_lawsuits_user ON lawsuits(user_id);
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_audit_user_date ON audit_logs(user_id, created_at);
```

## 4. Arquitetura v2.0 (planejada)

```
┌─────────────────────────────────────────────────────────────┐
│                Vercel (Next.js 16)                           │
│                                                              │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  App Router │  │  API Routes│  │  Server    │            │
│  │  (SSR/CSR)  │──│  (edge/node)│──│  Actions   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                       │                                     │
│                       ├── Z.AI SDK (server-only)            │
│                       ├── Prisma Client                     │
│                       └── NextAuth                          │
└───────────────────────┼─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ┌─────────┐    ┌──────────┐    ┌──────────┐
   │  Neon   │    │  Vercel  │    │  Z.AI    │
   │Postgres │    │  Blob    │    │  API     │
   │+pgvector│    │ (PDFs)   │    │ (GLM 5.2)│
   └─────────┘    └──────────┘    └──────────┘
```

### Diferenças v1.0 → v2.0

| Aspecto | v1.0 (atual) | v2.0 (planejado) |
|---------|--------------|------------------|
| Stack | HTML estático | Next.js 16 App Router |
| DB | localStorage | Postgres (Neon) + pgvector |
| Auth | Nenhum | NextAuth magic link |
| RAG | Context window | pgvector + embeddings |
| Tribunais | DataJud (metadados) | DataJud + Browserless (PDFs) |
| Sync | Não | Entre dispositivos |
| Multi-user | Não | Sim (RBAC) |
| Audit | Não | audit_logs table |
| Deploy | Arrastar pasta | `git push` |
| Custo free tier | R$ 0 | R$ 0 (Neon free) |

## 5. Fluxo de IA detalhado

```
[Usuário envia pergunta no Chat]
              │
              ▼
   [Detector de gatilhos]
   (STJ, STF, súmula, recente)
              │
   ┌──────────┴──────────┐
   │ sim                 │ não
   ▼                     ▼
[Web search Z.AI]   [Pula web]
   │                     │
   └──────────┬──────────┘
              ▼
   [Busca base local CP/CPP/CF]
              │
              ▼
   [Monta system prompt]
   ┌─────────────────────────────────┐
   │ Persona (Aury + Badaró + ...)   │
   │ Base legal local (se achou)     │
   │ Web results (se buscou)         │
   │ Instruções anti-alucinação      │
   └─────────────────────────────────┘
              │
              ▼
   [POST /chat/completions]
   https://api.z.ai/api/v1/chat/completions
              │
              ▼
   [GLM 5.2 gera resposta]
              │
              ▼
   [Exibe resposta + fontes]
   - Texto formatado markdown
   - Badges CP art. X
   - Links [1], [2] para STJ/STF
```

## 6. Fluxo de consulta DataJud

```
[Usuário digita número CNJ]
              │
              ▼
   [Parser do número CNJ]
   NNNNNNN-DD.AAAA.J.TR.OOOO
              │
              ▼
   [Mapeia J + TR para tribunal]
   ex: J=8, TR=26 → TJSP
              │
              ▼
   [GET https://api-publica.datajud.cnj.jus.br/
        api_publica/TJSP/processos/{numero}]
              │
              ▼
   [Renderiza resultado]
   - Classe processual
   - Assuntos
   - Órgão julgador
   - Movimentações (até 50)
   - JSON completo (collapsible)
              │
              ▼
   [Botão "Análise IA"]
   (opcional, envia JSON para GLM)
              │
              ▼
   [GLM 5.2 gera análise estratégica]
   - Resumo estratégico
   - Partes e posição
   - Risco (Baixo/Médio/Alto)
   - Próximos passos
   - Peças sugeridas
   - Fundamentação
```

## 7. Fluxo RAG (Documentos)

```
[Usuário cola texto + pergunta]
              │
              ▼
   [Conta tokens aproximados]
   (chars / 4 = tokens)
              │
              ▼
   [Verifica context window]
   GLM 5.2: ~128k tokens
   Se exceder: avisa usuário
              │
              ▼
   [Monta system prompt RAG]
   ┌─────────────────────────────────┐
   │ "Responda APENAS com base no    │
   │  documento fornecido.           │
   │  NUNCA invente súmulas,         │
   │  artigos, números de processo." │
   │                                 │
   │  temperature: 0.2 (baixa)       │
   └─────────────────────────────────┘
              │
              ▼
   [POST /chat/completions]
   system: prompt RAG
   user: "DOCUMENTO:\n{text}\n\nPERGUNTA:\n{question}"
              │
              ▼
   [GLM 5.2 gera resposta]
   - Resposta direta
   - Citação literal (entre aspas)
   - Observações
   - Ou "Não encontrei no documento"
```

## 8. Considerações de performance

### Latência típica
- Chat simples: 3-8s
- Chat com web search: 8-15s
- Geração de peça: 30-60s
- Estratégia: 30-60s
- Sustentação oral: 30-60s
- RAG documento curto: 5-15s
- RAG documento longo: 30-90s
- DataJud (sem IA): 1-3s
- DataJud + Análise IA: 20-40s

### Otimizações implementadas
- ✅ Reuse de chave Z.AI entre chamadas (não recria cliente)
- ✅ localStorage evita re-fetch de conversas
- ✅ Web search só dispara se gatilho detectado (não sempre)
- ✅ Limite de 50 movimentações no display (não renderiza 500)

### Otimizações planejadas (v2.0)
- Streaming SSE (token a token)
- Cache de respostas idênticas
- Compressão de prompts antigos
- Embeddings cacheados em Postgres

## 9. Considerações de segurança

### Modelo ameaça-contramedida

| Ameaça | Contramedida v1.0 | v2.0 |
|--------|-------------------|------|
| XSS rouba chave API | App sem deps externas (apenas Google Fonts) | CSP estrita + nonce |
| Prompt injection | System prompt fixo + user message separada | Sanitização + jailbreak detection |
| Vazamento de dados | localStorage só acessível pela própria origem | RLS no Postgres por user_id |
| Ataque MITM | HTTPS forçado (Vercel) | HSTS + cert pinning |
| Abuso da API Z.AI | Rate limit da própria Z.AI | Rate limit próprio + queue |
| Processo em segredo de justiça | DataJud retorna 404, sem expor | Mesmo + logs de acesso |

## 10. Evolução da equipe

### v1.0 (1 desenvolvedor)
- 1 full-stack JavaScript

### v2.0 (2-3 desenvolvedores)
- 1 backend (Next.js + Prisma)
- 1 frontend (React + shadcn/ui)
- 1 DevOps (Vercel + Neon + monitoramento)

### v3.0 (5+ desenvolvedores)
- Adicionar: especialista em IA (fine-tuning, embeddings)
- Adicionar: especialista em legal (validação jurídica)
- Adicionar: mobile developer

## 11. Monitoramento (v2.0+)

- **Sentry** para erros
- **Vercel Analytics** para UX
- **Logflare** para logs estruturados
- **Neon insights** para queries DB
- **Z.AI dashboard** para uso de API

## 12. Conclusão

A arquitetura v1.0 do drfuturo é **deliberadamente simples** para validar product-market fit com custo zero. Quando o uso justificar, a migração para v2.0 é bem definida e preserva toda a UX já construída.

A visão original do engenheiro (RAG, multi-tribunal, segurança, fundamentação) está **preservada e implementada** — apenas com stack tecnológica adaptada à realidade de deploy e custo do MVP.

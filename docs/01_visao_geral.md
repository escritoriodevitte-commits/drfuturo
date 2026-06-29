# drfuturo — Visão Geral

## 1. Introdução

**drfuturo** é uma plataforma jurídica inteligente que combina IA generativa (GLM 5.2), RAG anti-alucinação e integração oficial com tribunais brasileiros via API DataJud do CNJ. O projeto foi arquitetado para ser **simples de implantar** (estático, sem build) mas **robusto o suficiente para uso profissional** por advogados criminalistas.

## 2. Objetivos técnicos

- **Precisão de IA**: Implementação RAG (Retrieval-Augmented Generation) para evitar alucinações em respostas jurídicas
- **Integração oficial com tribunais**: Uso da API DataJud do CNJ (gratuita, oficial, sem scraping)
- **Privacidade**: Chave de API fica apenas no navegador; nenhum dado pessoal é coletado
- **Multi-modalidade**: 9 abas que cobrem todo o fluxo de trabalho do advogado criminalista
- **Deploy sem fricção**: HTML/CSS/JS puro — funciona em qualquer hospedagem estática

## 3. Stack tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Frontend | HTML5 + CSS3 + JavaScript vanilla | Zero build, zero dependência, máximo portabilidade |
| Estilização | CSS custom properties + Grid | Dark premium theme sem framework |
| IA | Z.AI GLM 5.2 | Custo-benefício, persona brasileira |
| Tribunais | API DataJud CNJ | Oficial, gratuita, sem captcha |
| Persistência | localStorage do navegador | Sem DB, sem servidor, sem custo |
| Hospedagem | Vercel (estático) | Free tier, deploy em 30s |

## 4. Arquitetura de alto nível

```
Browser (cliente)
   │
   ├── localStorage
   │   ├── zai_apikey (chave Z.AI)
   │   ├── drfuturo_conversations (chat)
   │   ├── drfuturo_sessions (audiências)
   │   ├── drfuturo_cases (casos)
   │   └── drfuturo_lawsuits (histórico CNJ)
   │
   ├── Z.AI API (HTTPS)
   │   └── GLM 5.2 (chat, peças, estratégia, RAG, sustentação)
   │
   └── DataJud CNJ API (HTTPS)
       └── Consulta de processos por número CNJ
```

## 5. Módulos funcionais

### 5.1 Chat
Conversação jurídica com persona configurada (Aury Lopes Jr + Badaró + Bottini + Nucci). Busca automática de jurisprudência na web quando detecta gatilhos (STJ, STF, súmula, etc.). Cada resposta inclui fontes consultadas.

### 5.2 Busca
Busca paralela em 2 fontes:
- **Web search Z.AI**: STJ, STF, JusBrasil, Planalto em tempo real
- **Base local CP/CPP/CF**: 40+ artigos essenciais embutidos no app (offline)

### 5.3 Peças
Catálogo de 41 tipos de peças criminais brasileiras, cada uma com:
- Fundamento legal (artigo CPP/CP/CF)
- Prazo processual
- Endereçamento
- Dica estratégica
- Query de busca de modelos

### 5.4 Estratégia
Teoria do caso em 4 blocos metodológicos:
1. **FATOS** — Releitura crítica do inquérito
2. **DIREITO** — Tipificação e excludentes
3. **PROVA** — Mapa probatório
4. **NARRATIVA** — Construção da tese defensiva

### 5.5 Audiências
5 tipos de audiência (Custódia, Instrução, Depoimento Especial, Alegações Finais, Sustentação Oral). Captura de notas em 6 categorias (depoimento, contradição, pergunta, nulidade, prova, observação). Timer, estatísticas ao vivo, e geração de sustentação oral final em 5 blocos.

### 5.6 Processos (DataJud CNJ)
Consulta de processos via API oficial do CNJ. Auto-detecção do tribunal pelo número CNJ (segmento + TR). Exibe classe, assuntos, órgão julgador, movimentações. Botão de análise IA do processo.

### 5.7 Documentos (RAG)
RAG sem banco vetorial — usa context window do GLM. Prompt explícito anti-alucinação. Temperature baixa (0.2). Citação literal de trechos do documento. Ideal para analisar petições, sentenças, contratos.

### 5.8 Casos
Biblioteca local de casos com anotações. Persistência em localStorage.

### 5.9 Config
Gerenciamento da chave Z.AI. Teste de conexão. Status do ambiente (single-user mode).

## 6. Roadmap de evolução

### v1.0 (atual)
- App estático, single-user
- 9 abas funcionais
- localStorage

### v2.0 (planejado)
- Migrar para Next.js 16 + Prisma + Postgres (Neon)
- Multi-usuário com NextAuth
- Sync entre dispositivos
- Histórico persistente em servidor
- Auditoria de uso

### v3.0 (visão)
- pgvector para RAG com múltiplos documentos
- Webhooks de movimentação processual
- Integração com calendário (PJe)
- App mobile (React Native)

Ver arquitetura detalhada da v2.0 em `ARCHITECTURE.md`.

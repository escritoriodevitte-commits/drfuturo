# PRD — drfuturo · Plataforma Jurídica Inteligente

## 1. Visão Geral

**drfuturo** é uma plataforma web para advogados criminalistas brasileiros que combina IA generativa, RAG anti-alucinação e integração oficial com tribunais. Objetivo: reduzir em 70% o tempo gasto em pesquisa jurídica, redação de peças e análise de processos.

## 2. Objetivos do Produto

### Objetivos primários
- **Eficiência**: Reduzir de 4h para 1h o tempo de produção de uma peça criminal
- **Precisão**: 0 alucinações em respostas com RAG (Documentos)
- **Acessibilidade**: Funciona em qualquer hospedagem gratuita (Vercel)
- **Privacidade**: Nenhum dado sai do navegador além do estritamente necessário

### Objetivos secundários
- **Educação jurídica**: Persona de juristas brasileiros ensina enquanto responde
- **Padronização**: 41 templates de peças seguem metodologia de Aury Lopes Jr + Badaró + Bottini + Nucci
- **Auditoria humana**: Toda resposta cita fontes para validação

## 3. Público-Alvo

### Persona principal
- **João, 35 anos, advogado criminalista solo**
- Atende 20-50 casos ativos
- Precisa de peças rápidas mas tecnicamente corretas
- Não tem tempo para pesquisa manual em JusBrasil
- Quer assistir audiências com notebook e anotar de forma estruturada

### Persona secundária
- **Ana, 28 anos, sócia de escritório boutique criminal**
- Coordena 3 associados
- Quer padronizar qualidade das peças
- Precisa de relatórios estratégicos por caso

## 4. Funcionalidades Principais

### 4.1 Chat (prioridade P0)
- Conversação com persona técnica
- Busca automática de jurisprudência
- Histórico persistente
- Streaming de resposta (UX)

### 4.2 Busca (P0)
- Web search (STJ, STF, JusBrasil)
- Base local CP/CPP/CF
- Filtro por fonte

### 4.3 Peças (P0)
- 41 tipos de peças criminais
- Formulário estruturado (cliente, fatos, tese)
- Geração com GLM 5.2
- Cópia para área de transferência

### 4.4 Estratégia (P1)
- Metodologia 4 blocos (Fatos · Direito · Prova · Narrativa)
- Tese recomendada
- Peças necessárias
- Riscos e alternativas
- Bibliografia

### 4.5 Audiências (P1)
- 5 tipos: Custódia, Instrução, Depoimento Especial, Alegações Finais, Sustentação
- Captura de notas em 6 categorias
- Timer
- Cadastro de teses do MP ao vivo
- Geração de sustentação oral final

### 4.6 Processos (P1)
- Consulta via API DataJud CNJ
- Auto-detecção de tribunal pelo número CNJ
- Análise IA do processo (risco, partes, próximos passos)
- Histórico de consultas

### 4.7 Documentos / RAG (P1)
- Cole texto de petição/sentença/contrato
- Pergunte sobre o conteúdo
- IA responde APENAS com base no texto (anti-alucinação)
- Cita trechos literais

### 4.8 Casos (P2)
- CRUD de casos
- Anotações livres
- Vinculação futura com peças e audiências

### 4.9 Config (P0)
- Gerenciamento de chave Z.AI
- Teste de conexão
- Status do ambiente

## 5. Requisitos Não-Funcionais

| Requisito | Meta |
|-----------|------|
| Performance (chat) | Primeiro token em < 2s |
| Performance (peça) | Geração completa em < 60s |
| Disponibilidade | 99% (depende da Z.AI) |
| Custo (free tier) | R$ 0 para uso até 50 chats/dia |
| Tamanho do app | < 200KB (gzipped) |
| Compatibilidade | Chrome 100+, Firefox 100+, Safari 15+ |
| Acessibilidade | WCAG AA (parcial) |

## 6. Métricas de Sucesso

### Curto prazo (3 meses)
- 100 advogados ativos
- 1000 peças geradas/mês
- NPS > 50

### Médio prazo (12 meses)
- 1000 advogados ativos
- 50000 consultas DataJud/mês
- Conversão para plano pago (v2.0 SaaS) de 5%

### Longo prazo (24 meses)
- 10000 advogados ativos
- Parcerias com escritórios grandes
- App mobile

## 7. Roadmap

### v1.0 (atual — Junho 2026)
- App estático, single-user
- 9 abas funcionais
- localStorage
- Deploy Vercel gratuito

### v1.1 (Julho 2026)
- Dark/light mode toggle
- Exportar conversas para PDF
- Mais 10 peças no catálogo (total 51)
- Lei 11.343 (drogas) completa na base local

### v2.0 (Setembro 2026)
- Migrar para Next.js 16 + Prisma + Postgres (Neon)
- Multi-usuário com NextAuth
- Sync entre dispositivos
- Plano pago (R$ 49/mês)

### v2.5 (Dezembro 2026)
- pgvector para RAG multi-documento
- Webhooks de movimentação processual
- App mobile (React Native)

### v3.0 (Março 2027)
- Marketplace de templates
- Parcerias com escolas da OAB
- API pública para integrações

## 8. Competidores

| Concurso | Diferencial do drfuturo |
|----------|-------------------------|
| JusBrasil | Foco em IA + geração de peças (JusBrasil é busca) |
| Lexter.ai | Custo (drfuturo é grátis no free tier) |
| Lawtics | Foco criminal (Lawtics é geral) |
| Turivius | Open-source + deploy próprio |

## 9. Riscos

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Z.AI aumentar preços | Média | Suporte a OpenAI no v2.0 |
| LGPD exigir mudanças | Baixa | Dados ficam no navegador |
| STJ mudar jurisprudência | Alta | Web search em tempo real |
| Bug no GLM 5.2 | Baixa | Fallback para GLM 4.6 |
| Usuário não configurar chave | Alta | UX clara + sugestões |

## 10. Glossário

- **RAG**: Retrieval-Augmented Generation — técnica de combinar busca + LLM para reduzir alucinações
- **DataJud**: API pública do CNJ com metadados de processos
- **CNJ**: Conselho Nacional de Justiça
- **PJe**: Processo Judicial Eletrônico — sistema principal dos tribunais brasileiros
- **e-SAJ**: Sistema de automação da justiça (TJSP, TJSC, etc.)
- **Projudi**: Sistema de tribunais como TJPR, TJGO
- **LGPD**: Lei Geral de Proteção de Dados (Lei 13.709/2018)
- **Persona**: Personalidade configurada no system prompt (ex: Aury Lopes Jr)

# drfuturo — IA e Precisão Jurídica

## 1. O problema das alucinações em IA jurídica

Modelos de linguagem (LLMs) como GLM 5.2, GPT-4 e Claude podem **inventar**:
- Números de súmulas (ex: "Súmula 542 STF" que não existe)
- Artigos de lei com texto incorreto
- Acórdãos com numero de REsp inventado
- Citações doutrinárias falsas

Em direito penal, isso é **inaceitável** — uma peça com jurisprudência inventada pode gerar nulidade processual e sanção ética da OAB.

## 2. Como o drfuturo mitiga alucinações

### 2.1 Persona técnica
O system prompt instrui o modelo a:
- **Nunca** inventar jurisprudência específica (número de HC, REsp, etc.)
- Se não souber, **dizer que não sabe** e sugerir busca
- Citar base legal no formato padrão (`art. 158-A, CPP`)

### 2.2 RAG no módulo Documentos
Quando o usuário cola um documento, o prompt é explícito:
```
Responda APENAS com base no documento fornecido.
NUNCA invente números, súmulas, artigos, citações.
Se não estiver no documento, diga: "Não encontrei esta informação."
```

Com `temperature=0.2` (baixa criatividade), o modelo fica conservador.

### 2.3 Base local CP/CPP/CF
40+ artigos essenciais do Código Penal, Código de Processo Penal e Constituição Federal embutidos no app. Quando uma pergunta toca nesses artigos, o texto real é injetado no prompt — o modelo não precisa "lembrar", apenas cita.

### 2.4 Web search sob demanda
Quando a pergunta menciona STJ, STF, súmula, precedente, ou "recente", o app busca em tempo real no JusBrasil, STJ, STF e Planalto. Os resultados reais são incluídos no prompt.

### 2.5 Validação humana
Todas as peças geradas terminam com:
> ⚠️ Peça para revisão do advogado responsável antes da protocolização.

## 3. Fluxo de processamento de IA

```
Usuário faz pergunta
        │
        ▼
[Detecção de gatilhos] ──→ precisa web search?
        │                          │
        │ não                      │ sim
        ▼                          ▼
[Busca base local]         [Web search Z.AI]
   CP/CPP/CF               STJ/STF/JusBrasil
        │                          │
        └──────────┬───────────────┘
                   ▼
       [Constrói prompt final]
       system: persona + base legal + web results
       user: pergunta original
                   │
                   ▼
           [GLM 5.2 (Z.AI)]
                   │
                   ▼
       [Resposta + fontes]
       exibe badges CP art. X
       links para STJ/STF
```

## 4. Comparação com abordagens mais complexas

| Abordagem | Vantagem | Desvantagem | drfuturo usa? |
|-----------|----------|-------------|---------------|
| LLM puro (sem RAG) | Simples | Alucina muito | ❌ |
| RAG com prompt (atual) | Simples, eficaz | Limite de context window | ✅ |
| RAG com pgvector | Multi-documento | Precisa Postgres + embeddings | Planejado v2.0 |
| RAG com Pinecone | Escala massiva | Custo, latência | ❌ |
| Fine-tuning em doutrina | Domínio especializado | Caro, difícil atualizar | ❌ |

## 5. Auditoria humana

Todo output de IA no drfuturo inclui:
- **Fontes consultadas** (CP/CPP art. X, [1] URL, [2] URL)
- **Disclaimer** de revisão obrigatória
- **Timestamp** de geração

O advogado **deve** clicar nos links e verificar antes de usar.

## 6. Quando NÃO confiar na IA

- Para identificar precedente específico (sempre confirme no STJ/STF)
- Para dosimetria exata de pena (use calculadora própria)
- Para prazos processuais (consulte o CPP diretamente)
- Para questões éticas (consulte o CED-OAB)

A IA é **assistente**, não substituto do advogado.

# drfuturo — Plataforma Jurídica Inteligente

**drfuturo** é uma plataforma jurídica com IA generativa (GLM 5.2), RAG anti-alucinação, integração oficial com tribunais via API DataJud CNJ, geração de 41 tipos de peças penais, captura de notas em audiências e geração de sustentação oral.

## 🎯 Para quem é

- Advogados criminalistas
- Advogados de outras áreas (Civil, Trabalhista, Tributário — adaptável)
- Escritórios de advocacia pequenos e médios
- Defensores públicos

## ✨ Funcionalidades

### 9 abas integradas

| Aba | O que faz |
|-----|-----------|
| 💬 **Chat** | Conversação jurídica com persona de Aury Lopes Jr + Badaró + Bottini + Nucci |
| 🔍 **Busca** | Web search (STJ, STF, JusBrasil) + base local CP/CPP/CF (40+ artigos) |
| 📄 **Peças** | Catálogo de 41 peças criminais com gerador GLM 5.2 |
| 🎯 **Estratégia** | Teoria do caso em 4 blocos (Fatos · Direito · Prova · Narrativa) |
| ⚖️ **Audiências** | Captura ao vivo + 5 tipos de audiência + geração de sustentação oral |
| 🔎 **Processos** | Consulta oficial via API DataJud CNJ + análise IA do processo |
| 📚 **Documentos** | RAG sem alucinação — cole texto, pergunte, IA responde só com base no doc |
| 📁 **Casos** | Biblioteca local de casos |
| ⚙️ **Config** | Gerenciamento da chave Z.AI |

## 🚀 Deploy em 5 minutos

### Stack 100% estática (HTML/CSS/JS)
- Sem build
- Sem banco de dados
- Sem servidor
- Funciona em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages)

### Passo a passo

1. **Baixar o ZIP** `drfuturo.zip`
2. **Extrair** numa pasta
3. **Subir para GitHub**:
   ```bash
   cd drfuturo
   git init
   git add .
   git commit -m "drfuturo v1.0"
   git remote add origin https://github.com/SEU_USER/drfuturo.git
   git branch -M main
   git push -u origin main
   ```
4. **Importar na Vercel**:
   - Acesse https://vercel.com/new
   - Selecione o repositório `drfuturo`
   - Framework: detectado automaticamente como "Other" (estático)
   - **Não precisa configurar nada**
   - Clique em Deploy
5. **Configurar sua chave Z.AI**:
   - Acesse sua URL da Vercel
   - Aba **⚙️ Config**
   - Cole sua chave (obtenha em https://z.ai/manage-apikey/apikey-list)
   - Salvar → Testar
6. **Usar!** 🎉

## 🔒 Segurança

- ✅ Chave Z.AI fica em `localStorage` do navegador (não enviado a servidores além da própria Z.AI)
- ✅ API DataJud é oficial do CNJ — sem scraping, sem burlar captcha
- ✅ RAG anti-alucinação: prompt explícito para não inventar
- ✅ Nenhum dado pessoal coletado pelo app

## 🧱 Arquitetura técnica

```
┌─────────────────────────────────────────────────────────┐
│              drfuturo (browser)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐│
│  │  Chat    │  │  Peças   │  │Audiences │  │ Casos    ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘│
│       │             │             │             │       │
│       └─────────────┴─────────────┴─────────────┘       │
│                          │                              │
│                   localStorage (estado)                  │
└──────────────────────────┼──────────────────────────────┘
                           │ HTTPS
                           ▼
        ┌─────────────────────────────────┐
        │   Z.AI API (api.z.ai/api/v1)    │
        │   ├── GLM 5.2 chat              │
        │   └── Web search tool           │
        └─────────────────────────────────┘

                           │ HTTPS
                           ▼
        ┌─────────────────────────────────┐
        │  DataJud API (CNJ oficial)      │
        │  api-publica.datajud.cnj.jus.br │
        │  ├── Consulta por número CNJ    │
        │  └── Metadados: partes, movs    │
        └─────────────────────────────────┘
```

### Por que estático?

| Alternativa | Por que não |
|-------------|-------------|
| Next.js serverless | Build complexo, env vars, Prisma, deploy falha |
| Python FastAPI | Hospedagem Python é cara na Vercel |
| NestJS | Overkill para 1 app |

Estático = 31KB, 0 dependências, 0 build, funciona em qualquer lugar.

### Evolução para SaaS (futuro)

Quando precisar de:
- Multi-usuário com sync entre dispositivos
- Histórico persistente em servidor
- Auditoria de uso
- Rate limiting por usuário

→ Migrar para Next.js 16 + Prisma + Postgres (Neon) + NextAuth. Arquitetura completa em `docs/ARCHITECTURE.md`.

## 📚 Documentação

- [`docs/01_visao_geral.md`](docs/01_visao_geral.md) — Visão arquitetural
- [`docs/02_ia_e_precisao.md`](docs/02_ia_e_precisao.md) — Como o RAG funciona
- [`docs/03_seguranca_e_conformidade.md`](docs/03_seguranca_e_conformidade.md) — LGPD e segurança
- [`docs/04_guia_configuracao.md`](docs/04_guia_configuracao.md) — Configurar chaves
- [`docs/05_prd.md`](docs/05_prd.md) — PRD do produto
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Arquitetura técnica detalhada

## 🆘 Solução de problemas

### "Configure sua chave Z.AI na aba Config"
Sua chave ainda não foi salva. Vá na aba Config (⚙️) e cole sua chave.

### "Erro 401 Unauthorized"
Chave Z.AI inválida ou expirada. Gere nova chave em https://z.ai/manage-apikey/apikey-list

### "Processo não encontrado no DataJud"
Possíveis causas:
- Número CNJ inválido (verifique dígito verificador)
- Tribunal não aderiu ao SNIJ (raros)
- Processo em segredo de justiça

### Erro de CORS ao consultar DataJud
A API DataJud suporta CORS. Se acontecer, é provável que você esteja usando um browser muito antigo. Atualize o Chrome/Firefox.

## 📝 Licença

MIT — use livremente.

## 🤝 Créditos

- Persona jurídica: Aury Lopes Jr, Gustavo Badaró, Pierpaolo Bottini, Guilherme de Souza Nucci, Renato Brasileiro de Lima
- API: Z.AI (GLM 5.2) + DataJud CNJ
- Base legal: Código Penal, Código de Processo Penal, Constituição Federal

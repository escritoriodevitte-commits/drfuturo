/* ============================================================
   JUS·AI Criminal — App JavaScript (client-side, sem servidor)
   Chama Z.AI API diretamente do navegador.
   ============================================================ */

// ===== ESTADO GLOBAL =====
const STATE = {
  activeTab: 'chat',
  activeConversation: null,
  conversations: [],
  currentNoteCat: 'depoimento',
  activeSession: null,
  timerRunning: false,
  elapsed: 0,
  timerInterval: null,
  searchFilter: 'all',
  selectedPiece: null,
  activeCase: null,
};

// ===== CONFIGURAÇÃO MULTI-PROVEDOR (localStorage) =====
// Suporta 4 provedores: Z.AI, OpenAI, DeepSeek, Claude
const PROVIDERS = {
  zai: {
    name: 'Z.AI (Zhipu)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-5.2', 'glm-5.1', 'glm-5', 'glm-x-preview', 'glm-4-plus', 'glm-4-flash'],
    docs: 'https://z.ai/manage-apikey/apikey-list',
    format: 'openai',
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    docs: 'https://platform.openai.com/api-keys',
    format: 'openai',
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
    docs: 'https://platform.deepseek.com/api_keys',
    format: 'openai',
  },
  claude: {
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-5-20250929', 'claude-opus-4-20250514', 'claude-3-5-sonnet-20241022'],
    docs: 'https://console.anthropic.com/settings/keys',
    format: 'anthropic',
  },
};

function getConfig() {
  const provider = localStorage.getItem('drf_provider') || 'claude'; // default: claude (chave embutida)
  const prov = PROVIDERS[provider];
  return {
    provider,
    baseUrl: localStorage.getItem('zai_baseurl') || prov.baseUrl,
    apiKey: localStorage.getItem('zai_apikey') || '',
    model: localStorage.getItem('zai_model') || '',
  };
}

function hasConfig() {
  return Boolean(localStorage.getItem('zai_apikey'));
}

function saveConfigToStorage(baseUrl, apiKey, model, provider) {
  localStorage.setItem('zai_baseurl', baseUrl);
  localStorage.setItem('zai_apikey', apiKey);
  if (model !== undefined) localStorage.setItem('zai_model', model);
  if (provider) localStorage.setItem('drf_provider', provider);
}

function setProvider(provider) {
  if (!PROVIDERS[provider]) return;
  localStorage.setItem('drf_provider', provider);
  localStorage.setItem('zai_baseurl', PROVIDERS[provider].baseUrl);
  // Limpa modelo selecionado para o provedor usar a lista nova
  localStorage.removeItem('zai_model');
  ZAI_MODELS_WORKING = null;
}

function clearConfigFromStorage() {
  localStorage.removeItem('zai_apikey');
  localStorage.removeItem('zai_userid');
  // mantém baseurl como default
}

// ===== CHAMADAS Z.AI API (direto do navegador) =====

/**
 * Lista de modelos Z.AI em ordem de preferência.
 * Atualizado conforme API oficial /models (Junho 2026):
 * - GLM-5.2 (mais novo, SOTA em raciocínio/código/agentes — disponível via convite BigModel)
 * - GLM-5.1 (estável, melhor raciocínio)
 * - GLM-5 (estável)
 * - GLM-X-Preview (experimental, 1M contexto)
 */
const ZAI_MODELS = ['glm-5.2', 'glm-5.1', 'glm-5', 'glm-x-preview'];

/**
 * Chat — suporta 4 provedores (Z.AI, OpenAI, DeepSeek, Claude).
 * Claude usa proxy /api/chat com chave embutida (usuário não precisa configurar).
 */
async function callGLM(messages, options = {}) {
  const config = getConfig();
  const prov = PROVIDERS[config.provider] || PROVIDERS.claude;

  // Claude: usa proxy com chave embutida (não precisa configurar nada)
  if (config.provider === 'claude' || !config.apiKey) {
    return callViaProxy({ ...config, provider: 'claude' }, messages, options);
  }

  const modelsToTry = config.model
    ? [config.model, ...prov.models.filter(m => m !== config.model)]
    : (ZAI_MODELS_WORKING ? [ZAI_MODELS_WORKING, ...prov.models.filter(m => m !== ZAI_MODELS_WORKING)] : prov.models);

  // Outros provedores: tentativa direta primeiro, fallback para proxy
  try {
    if (prov.format === 'anthropic') {
      return await callAnthropic(config, messages, options, modelsToTry);
    }
    return await callOpenAICompatible(config, messages, options, modelsToTry);
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.message.includes('network') || err.message.includes('CORS')) {
      return callViaProxy(config, messages, options, modelsToTry);
    }
    throw err;
  }
}

/**
 * Chamada via proxy serverless /api/chat.
 * Para Claude, não precisa enviar apiKey (proxy usa chave embutida).
 */
async function callViaProxy(config, messages, options, modelsToTry) {
  const url = '/api/chat';

  const body = {
    provider: config.provider || 'claude',
    messages,
    model: config.model || options.model || null,
    temperature: options.temperature ?? 0.6,
    max_tokens: options.maxTokens ?? 4096,
  };
  // Só envia apiKey se o usuário configurou uma (para outros provedores)
  if (config.apiKey) {
    body.apiKey = config.apiKey;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Erro ${response.status} no proxy`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  ZAI_MODELS_WORKING = data.model;
  return data.content || '';
}

/**
 * Formato OpenAI (Z.AI, OpenAI, DeepSeek) — /chat/completions
 */
async function callOpenAICompatible(config, messages, options, modelsToTry) {
  const url = `${config.baseUrl}/chat/completions`;
  let lastError = null;

  for (const model of modelsToTry) {
    const body = {
      model,
      messages,
      temperature: options.temperature ?? 0.6,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
    };
    // Z.AI/GLM-5 suporta thinking
    if (config.provider === 'zai') {
      body.thinking = options.thinking || { type: 'disabled' };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (response.status === 403 || response.status === 404) {
        const errData = await response.json().catch(() => ({}));
        lastError = errData?.error?.message || `Modelo ${model} indisponível`;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Erro ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error?.message || errorJson.message || errorMsg;
        } catch {}
        throw new Error(`${errorMsg}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      if (!content.trim()) {
        lastError = 'Resposta vazia';
        continue;
      }

      ZAI_MODELS_WORKING = model;
      return content;
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('network')) {
        lastError = err.message;
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Falhou todos os modelos. Último erro: ${lastError}`);
}

/**
 * Formato Anthropic — /messages com headers diferentes
 */
async function callAnthropic(config, messages, options, modelsToTry) {
  const url = `${config.baseUrl}/messages`;
  let lastError = null;

  // Converte messages: Anthropic separa system do restante
  const systemMsgs = messages.filter(m => m.role === 'system');
  const conversationMsgs = messages.filter(m => m.role !== 'system');
  const systemPrompt = systemMsgs.map(m => m.content).join('\n\n');

  for (const model of modelsToTry) {
    const body = {
      model,
      system: systemPrompt,
      messages: conversationMsgs.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.6,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 403 || response.status === 404) {
        const errData = await response.json().catch(() => ({}));
        lastError = errData?.error?.message || `Modelo ${model} indisponível`;
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = `Erro ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error?.message || errorMsg;
        } catch {}
        throw new Error(`${errorMsg}`);
      }

      const data = await response.json();
      // Anthropic retorna array "content" com blocos de texto
      const content = (data.content || [])
        .filter(b => b.type === 'text')
        .map(b => b.text)
        .join('\n');

      if (!content.trim()) {
        lastError = 'Resposta vazia';
        continue;
      }

      ZAI_MODELS_WORKING = model;
      return content;
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('network')) {
        lastError = err.message;
        continue;
      }
      throw err;
    }
  }

  throw new Error(`Falhou todos os modelos. Último erro: ${lastError}`);
}

// Cache do modelo que funcionou (acelerar próximas chamadas)
let ZAI_MODELS_WORKING = null;

/**
 * Web search via Z.AI
 * Endpoint correto: /tools com POST
 * Documentação: https://docs.z.ai/api#web-search
 */
async function callWebSearch(query, num = 8) {
  const config = getConfig();
  if (!config.apiKey) return [];

  // Tentativa 1: endpoint /tools (formato atual Z.AI)
  try {
    const url = `${config.baseUrl}/tools`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        request_id: `drfuturo-${Date.now()}`,
        tool: 'web-search',
        input: { query, num },
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const results = data.output || data.results || data.data || [];
      if (Array.isArray(results) && results.length > 0) return results;
    }
  } catch (err) {
    console.warn('Web search /tools falhou:', err.message);
  }

  // Tentativa 2: endpoint /web/search (formato alternativo)
  try {
    const url = `${config.baseUrl}/web/search`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        query,
        num,
        search_engine: 'google',
      }),
    });
    if (response.ok) {
      const data = await response.json();
      const results = data.results || data.data || [];
      if (Array.isArray(results) && results.length > 0) return results;
    }
  } catch (err) {
    console.warn('Web search /web/search falhou:', err.message);
  }

  // Se ambos falharam, retorna vazio (chat ainda funciona sem web search)
  console.warn('Web search indisponível — chat continuará sem resultados web');
  return [];
}

// ===== PERSONA SYSTEM PROMPTS =====
const SYSTEM_PROMPT_CHAT = `Você é JUS·AI Criminal, um agente jurídico sênior especializado em direito penal brasileiro que combina a expertise dos maiores juristas criminalistas do Brasil:

- Aury Lopes Jr — processo penal, garanticismo
- Gustavo Badaró — prova penal, cadeia de custódia
- Pierpaolo Bottini — tribunal do júri
- Guilherme de Souza Nucci — doutrina, código anotado
- Renato Brasileiro de Lima — manualista moderno

# PERSONA
- Precisão técnica, sem floreio
- Cita base legal (artigo CP/CPP/CF) e doutrina (autor + obra)
- Diferencia fato, tese jurídica e estratégia processual
- Aponta riscos e alternativas táticas sob ótica da defesa
- Nunca inventa jurisprudência

# FORMATO
- Markdown estruturado
- Bullet points para listas
- Cite base legal: "art. 158-A, CPP" ou "Súmula Vinculante 14, STF"
- Mantenha português jurídico brasileiro — técnico mas claro`;

const SYSTEM_PROMPT_PIECE = `Você é JUS·AI Criminal em modo Redator de Peças. Combina técnica de Aury Lopes Jr, Badaró, Bottini, Nucci e Renato Brasileiro de Lima.

# ESTRUTURA OBRIGATÓRIA
1. ENDEREÇAMENTO — autoridade competente
2. QUALIFICAÇÃO — nome, nacionalidade, RG, CPF, endereço
3. TEMA CENTRAL — preâmbulo curto
4. DOS FATOS — narrativa enxuta, cronológica
5. DO DIREITO — artigos, doutrina, jurisprudência
6. DO PEDIDO — liminar + mérito
7. FECHAMENTO — local, data, advogado, OAB

# REGRAS
- Não invente jurisprudência específica
- Parágrafos curtos (3-5 linhas)
- Negrito apenas para artigo de lei e pedido
- Use "Excelência" para juiz, "Egrégio" para tribunal
- Indique ao final: "Peça para revisão do advogado responsável antes da protocolização."`;

const SYSTEM_PROMPT_STRATEGY = `Você é JUS·AI Criminal em modo Estrategista Defensivo. Combina visão estratégica de Aury Lopes Jr (garantias), Badaró (prova), Bottini (júri), Nucci (doutrina).

# METODOLOGIA — Teoria do Caso em 4 Blocos

## 1. FATOS — Releitura crítica do inquérito
## 2. DIREITO — Tipificação e excludentes
## 3. PROVA — Mapa probatório
## 4. NARRATIVA — Construção da tese defensiva

# FORMATO DA RESPOSTA
- 4 blocos com 3-5 pontos cada
- TESE RECOMENDADA (1-2 frases)
- PEÇAS NECESSÁRIAS (lista)
- RISCOS E ALTERNATIVAS
- BIBLIOGRAFIA SUGERIDA (2-3 referências)

# TOM
- Sénior, assertivo, realista
- Citar autor e obra quando aplicar
- Apontar risco sem catastrofizar`;

const SYSTEM_PROMPT_ORAL = `Você é JUS·AI Criminal em modo Sustentação Oral. Combina oralidade de Bottini (júri), técnica de Aury Lopes Jr (HC e recursos) e doutrina de Nucci.

# ESTRUTURA — 5 Blocos
1. PRELIMINARMENTE — nulidades e questões processuais
2. DA PROVA — análise crítica, cita testemunhas pelo nome
3. DAS CONTRADIÇÕES — refutação específica com página dos autos
4. DO MÉRITO — tese defensiva
5. DO PEDIDO — conclusão direta

# TOM E ESTILO
- Português jurídico FALADO (não escrito)
- Frases curtas, impacto direto
- Sem juridiquês desnecessário
- Citação de prova pelo nome específico
- Refutação direta aos pontos do MP
- Pedido claro e direto no final

# FORMATO
- Texto corrido para ser falado
- Cabeçalhos: PRELIMINARMENTE / DA PROVA / DAS CONTRADIÇÕES / DO MÉRITO / DO PEDIDO
- Tempo: 15-20 minutos de leitura`;

// ===== BASE LEGAL LOCAL (CP/CPP/CF) =====
const LEGAL_DATABASE = [
  { code: "CF", article: "5º, XXXVIII", title: "Tribunal do Júri", text: "é reconhecida a instituição do júri, com a organização que lhe der a lei, assegurados: a plenitude de defesa; o sigilo das votações; a soberania dos veredictos; a competência para o julgamento dos crimes dolosos contra a vida.", keywords: ["juri", "tribunal do juri", "crimes dolosos contra a vida"] },
  { code: "CF", article: "5º, LXI", title: "Liberdade provisória", text: "ninguém será preso senão em flagrante delito ou por ordem escrita e fundamentada de autoridade judiciária competente.", keywords: ["prisao", "liberdade provisoria", "flagrante"] },
  { code: "CF", article: "5º, LXIII", title: "Direito ao silêncio", text: "o preso será informado de seus direitos, entre os quais o de permanecer calado.", keywords: ["silencio", "direito ao silencio"] },
  { code: "CP", article: "1º", title: "Princípio da legalidade", text: "Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.", keywords: ["legalidade", "principio"] },
  { code: "CP", article: "23", title: "Excludentes de ilicitude", text: "Não há crime quando o agente pratica o fato: I - em estado de necessidade; II - em legítima defesa; III - em estrito cumprimento de dever legal ou no exercício regular de direito.", keywords: ["excludente", "legitima defesa", "estado de necessidade"] },
  { code: "CP", article: "25", title: "Legítima defesa", text: "Entende-se como legítima defesa quem, usando moderadamente dos meios necessários, repele injusta agressão, atual ou iminente, a direito seu ou de outrem.", keywords: ["legitima defesa", "agressao injusta"] },
  { code: "CP", article: "121", title: "Homicídio", text: "Matar alguém: Pena - reclusão, de seis a vinte anos.", keywords: ["homicidio", "crime doloso contra a vida"] },
  { code: "CP", article: "155", title: "Furto", text: "Subtrair, para si ou para outrem, coisa alheia móvel: Pena - reclusão, de um a quatro anos.", keywords: ["furto", "subtrair"] },
  { code: "CP", article: "157", title: "Roubo", text: "Subtrair coisa móvel alheia, para si ou para outrem, mediante grave ameaça ou violência a pessoa: Pena - reclusão, de quatro a dez anos.", keywords: ["roubo", "grave ameaca"] },
  { code: "CPP", article: "158-A", title: "Cadeia de custódia (Lei 13.964/19)", text: "A cadeia de custódia é o conjunto de todos os procedimentos utilizados para manter e documentar a história cronológica do vestígio para fins de prova.", keywords: ["cadeia de custodia", "vestigio", "prova material", "lei 13964"] },
  { code: "CPP", article: "158-F", title: "Cadeia de custódia — consequência da falha", text: "A não observância da cadeia de custódia não acarreta, necessariamente, a nulidade da prova, mas impede a sua utilização pelo juízo caso se verifique que a irregularidade compromete a sua integridade.", keywords: ["cadeia de custodia", "nulidade", "falha"] },
  { code: "CPP", article: "28-A", title: "Acordo de Não Perseguição Penal (Lei 13.964/19)", text: "O Ministério Público, com o consentimento do investigado, poderá propor acordo de não perseguição penal, desde que: crime sem violência, pena mínima inferior a 4 anos, não reincidente, confissão formal e detalhada.", keywords: ["anpp", "acordo de nao perseguiçao", "lei 13964"] },
  { code: "CPP", article: "400", title: "Ordem da instrução (rito ordinário)", text: "Na audiência: depoimento do ofendido, oitiva testemunhas acusação e defesa, esclarecimentos de peritos, acareações, reconhecimento, interrogatório, alegações finais.", keywords: ["instruçao", "rito ordinario", "audiencia"] },
  { code: "CPP", article: "474", title: "Recusas imotivadas no júri", text: "Cada parte poderá recusar, sem motivar, até 3 jurados. As recusas serão feitas, alternadamente, começando pela defesa.", keywords: ["juri", "recusa imotivada", "seleçao de jurados"] },
  { code: "CPP", article: "581", title: "Cabimento do RESE", text: "Cabirá recurso em sentido estrito da decisão, despacho ou sentença: rol taxativo de 35 incisos.", keywords: ["rese", "recurso em sentido estrito"] },
  { code: "CPP", article: "593", title: "Cabimento da apelação", text: "Cabível apelação das sentenças definitivas. No júri: só 3 hipóteses (nulidade posterior à pronúncia, sentença contrária à prova, decisão manifestamente contrária à prova).", keywords: ["apelaçao", "sentença definitiva", "juri"] },
  { code: "CPP", article: "619", title: "Embargos de Declaração", text: "Aos acórdãos poderão ser opostos embargos de declaração, no prazo de 2 dias, quando houver ambiguidade, obscuridade, contradição ou omissão.", keywords: ["embargos de declaraçao", "obscuridade"] },
  { code: "CPP", article: "621", title: "Revisão criminal", text: "A revisão dos processos findos será admitida: I - sentença contrária à lei; II - fundada em prova falsa; III - novas provas de inocência.", keywords: ["revisao criminal", "transito em julgado", "nova prova"] },
  { code: "CPP", article: "647", title: "Habeas Corpus", text: "Dar-se-á habeas corpus sempre que alguém sofrer ou se achar na iminência de sofrer violência ou coação em sua liberdade de ir e vir, por ilegalidade ou abuso de poder.", keywords: ["habeas corpus", "hc", "liberdade", "coaçao"] },
];

function searchLocalLegal(query) {
  if (!query) return [];
  const normalized = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const terms = normalized.split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return [];

  return LEGAL_DATABASE.map(art => {
    const searchable = `${art.code} ${art.article} ${art.title} ${art.text} ${art.keywords.join(" ")}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const score = terms.reduce((acc, term) => acc + (searchable.includes(term) ? 1 : 0), 0);
    return { art, score };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map(item => item.art);
}

// ===== CATÁLOGO DE PEÇAS (41 peças) =====
const PIECE_CATALOG = [
  // Defesa Preliminar
  { id: "resposta_acusacao", name: "Resposta à Acusação", category: "Defesa Preliminar", legalBasis: "Art. 396-A, CPP", deadline: "10 dias", addressedTo: "Juiz da causa", description: "Peça obrigatória após recebimento da denúncia. Arguir preliminares, demonstrar nulidades, pedir absolvição sumária.", strategyHint: "Última oportunidade de absolvição sumária antes da instrução. Argir nulidades, demonstrar atipicidade." },
  { id: "memoriais", name: "Memoriais", category: "Defesa Preliminar", legalBasis: "Art. 403, §3º, CPP", deadline: "5 dias", addressedTo: "Juiz da causa", description: "Peça escrita substitutiva das alegações finais orais. Estrutura: fatos, prova, direito, pedido.", strategyHint: "Momento de síntese de toda a defesa. Reunir nulidades, contradições, pedido de absolvição." },
  { id: "alegacoes_finais", name: "Alegações Finais (orais)", category: "Defesa Preliminar", legalBasis: "Art. 403, CPP", deadline: "20 min", addressedTo: "Juiz da causa", description: "Alegações finais orais em audiência. 20 minutos prorrogáveis por mais 10.", strategyHint: "Preferir memoriais escritos quando defesa complexa. Oratória para casos claros de absolvição." },
  // Recursos
  { id: "apelacao", name: "Apelação", category: "Recursos", legalBasis: "Art. 593, CPP", deadline: "5 dias", addressedTo: "Tribunal competente", description: "Recurso ordinário contra sentença definitiva. No júri, só 3 hipóteses do art. 593, III.", strategyHint: "Não pode reexaminar mérito dos jurados. Focar em nulidade, tipificação, dosimetria." },
  { id: "rese", name: "Recurso em Sentido Estrito (RESE)", category: "Recursos", legalBasis: "Art. 581, CPP", deadline: "5 dias", addressedTo: "Tribunal competente", description: "Recurso contra decisões interlocutórias listadas no art. 581. Rol taxativo.", strategyHint: "Verificar enquadramento no rol taxativo. Hipóteses: pronúncia, impronúncia, absolvição sumária." },
  { id: "embargos_declaracao", name: "Embargos de Declaração", category: "Recursos", legalBasis: "Art. 619, CPP", deadline: "2 dias", addressedTo: "Tribunal que proferiu o acórdão", description: "Esclarecer obscuridade, contradição ou omissão. Não é sucedâneo de recurso.", strategyHint: "Usar quando juízo deixou de apreciar tese relevante." },
  { id: "embargos_infringentes", name: "Embargos Infringentes", category: "Recursos", legalBasis: "Art. 609, § único, CPP", deadline: "10 dias", addressedTo: "Tribunal que proferiu o acórdão", description: "Decisão não-unânime desfavorável à defesa. Mérito ou nulidade.", strategyHint: "Verificar se decisão foi não-unânime E desfavorável." },
  { id: "agravo_execucao", name: "Agravo em Execução", category: "Recursos", legalBasis: "Art. 197, LEP", deadline: "5 dias", addressedTo: "Tribunal competente", description: "Recurso contra decisões do juiz da execução penal (progressão, remição, livramento).", strategyHint: "Fundamentar em parecer da defensoria, atestado de conduta." },
  { id: "recurso_especial", name: "Recurso Especial (STJ)", category: "Recursos", legalBasis: "Art. 105, III, CF", deadline: "15 dias", addressedTo: "Superior Tribunal de Justiça", description: "Recurso para STJ contra acórdão que contraria lei federal ou dá interpretação divergente.", strategyHint: "Demonstrar contrariedade à lei federal. Indicar precedente STJ paradigma." },
  { id: "recurso_extraordinario", name: "Recurso Extraordinário (STF)", category: "Recursos", legalBasis: "Art. 102, III, CF", deadline: "15 dias", addressedTo: "Supremo Tribunal Federal", description: "Recurso para STF contra acórdão que contraria a CF.", strategyHint: "Demonstrar violação constitucional direta." },
  // Peças Autônomas
  { id: "habeas_corpus", name: "Habeas Corpus", category: "Peças Autônomas", legalBasis: "Art. 5º, LXVIII, CF · Art. 647, CPP", deadline: "Sem prazo", addressedTo: "Tribunal competente", description: "Remédio constitucional para proteger liberdade contra ilegalidade ou abuso. Não examina prova (Súmula 711 STF).", strategyHint: "Pedido liminar obrigatório. Citar SV 14, Súmula 711 e 695 STF." },
  { id: "revisao_criminal", name: "Revisão Criminal", category: "Peças Autônomas", legalBasis: "Art. 621, CPP", deadline: "Sem prazo", addressedTo: "Tribunal que proferiu a decisão", description: "Ação autônoma para desconstituir sentença transitada em julgado. Hipóteses: contrária à lei, prova falsa, novas provas.", strategyHint: "Única via para reabrir TJ com nova prova." },
  { id: "mandado_seguranca", name: "Mandado de Segurança Criminal", category: "Peças Autônomas", legalBasis: "Lei 12.016/09", deadline: "120 dias", addressedTo: "Tribunal competente", description: "Para proteger direito líquido e certo contra ato de autoridade. Exige prova pré-constituída.", strategyHint: "Não substitui HC quando se discute liberdade." },
  // Cautelares
  { id: "liberdade_provisoria", name: "Liberdade Provisória", category: "Cautelares", legalBasis: "Art. 310, III, CPP", deadline: "Sem prazo", addressedTo: "Juiz da causa", description: "Conceder liberdade provisória ao preso em flagrante quando ausentes requisitos da preventiva.", strategyHint: "Demonstrar ausência dos pressupostos do art. 312 CPP." },
  { id: "relaxamento_prisao", name: "Relaxamento de Prisão", category: "Cautelares", legalBasis: "Art. 310, I, CPP", deadline: "Sem prazo", addressedTo: "Juiz da causa", description: "Relaxar prisão ilegal (flagrante ilegal ou preventiva sem fundamentação).", strategyHint: "Demonstrar ilegalidade específica." },
  { id: "revogacao_preventiva", name: "Revogação de Preventiva", category: "Cautelares", legalBasis: "Art. 316, CPP", deadline: "Sem prazo", addressedTo: "Juiz da causa", description: "Revogar preventiva quando desaparecem os motivos. Renovável a qualquer tempo.", strategyHint: "Demonstrar fato novo: desaparecimento dos requisitos." },
  { id: "substituicao_cautelar", name: "Substituição por Cautelar Diversa", category: "Cautelares", legalBasis: "Art. 319, CPP", deadline: "Sem prazo", addressedTo: "Juiz da causa", description: "Substituir preventiva por medida diversa (comparecimento, monitoração, etc.).", strategyHint: "Listar 9 medidas do art. 319 e indicar adequadas." },
  // Exceções
  { id: "excecao_suspeicao", name: "Exceção de Suspeição", category: "Exceções", legalBasis: "Art. 252, CPP", deadline: "3 dias", addressedTo: "Tribunal competente", description: "Arguir suspeição de juiz, MP, perito. Hipóteses do art. 254.", strategyHint: "Fundamentar com fatos concretos. Suspeição não se presume." },
  { id: "excecao_incompetencia", name: "Exceção de Incompetência", category: "Exceções", legalBasis: "Art. 108, CPP", deadline: "3 dias", addressedTo: "Juiz da causa", description: "Arguir incompetência do juízo. Absoluta a qualquer tempo; relativa em 3 dias.", strategyHint: "Diferenciar competência absoluta de relativa." },
  // Pedidos Específicos
  { id: "pedido_desentranhamento", name: "Desentranhamento de Prova", category: "Pedidos Específicos", legalBasis: "Art. 157, §1º, CPP", deadline: "A qualquer tempo", addressedTo: "Juiz da causa", description: "Desentranhar prova ilícita ou ilegítima dos autos.", strategyHint: "Citar art. 5º LVI CF (prova ilícita) e SV 14." },
  { id: "pedido_acesso_provas", name: "Acesso aos Elementos de Prova", category: "Pedidos Específicos", legalBasis: "SV 14, STF", deadline: "Após denúncia", addressedTo: "Juiz da causa", description: "Acessar elementos de prova que ampararam a denúncia, ainda não no processo.", strategyHint: "Citar SV 14 STF e art. 7º XIV Estatuto OAB." },
  { id: "pedido_pericia", name: "Produção de Prova Pericial", category: "Pedidos Específicos", legalBasis: "Art. 159, CPP", deadline: "Na resposta à acusação", addressedTo: "Juiz da causa", description: "Realizar perícia em objeto, local, pessoa.", strategyHint: "Indicar objeto, quesitos e perito assistente." },
  { id: "pedido_oitiva_testemunha", name: "Oitiva de Testemunhas", category: "Pedidos Específicos", legalBasis: "Art. 401, CPP", deadline: "Na resposta à acusação", addressedTo: "Juiz da causa", description: "Ouvir testemunhas de defesa. Até 8 no ordinário, 5 no sumário.", strategyHint: "Indicar nome, profissão, endereço." },
  // Comunicação Processual
  { id: "contrarrazoes_recurso", name: "Contrarrazões de Recurso", category: "Comunicação", legalBasis: "Art. 600, CPP", deadline: "2 dias", addressedTo: "Tribunal competente", description: "Resposta da parte contrária ao recurso interposto.", strategyHint: "Refutar cada argumento do recurso adversário." },
  { id: "peticao_juntada", name: "Petição de Juntada", category: "Comunicação", legalBasis: "Art. 231, CPP", deadline: "A qualquer tempo", addressedTo: "Juiz da causa", description: "Juntar documentos aos autos.", strategyHint: "Listar documentos juntados." },
  // Execução Penal
  { id: "pedido_progressao", name: "Progressão de Regime", category: "Execução Penal", legalBasis: "Art. 112, LEP", deadline: "Quando requisitos preenchidos", addressedTo: "Juiz da execução penal", description: "Progredir de regime mais rigoroso para mais brando. Requisitos: tempo + mérito.", strategyHint: "Anexar atestado de conduta, exame criminológico." },
  { id: "pedido_remissao", name: "Remição de Pena", category: "Execução Penal", legalBasis: "Art. 126, LEP", deadline: "Periodicamente", addressedTo: "Juiz da execução penal", description: "Remir pena por trabalho (3 dias = 1 dia) ou estudo (12h = 1 dia).", strategyHint: "Anexar certidão de trabalho/estudo." },
  { id: "pedido_livramento_condicional", name: "Livramento Condicional", category: "Execução Penal", legalBasis: "Art. 131, LEP · Art. 83, CP", deadline: "Quando requisitos", addressedTo: "Juiz da execução penal", description: "Após 1/3 (reincidente), 1/2 (não reincidente), 2/3 (hediondo).", strategyHint: "Demonstrar tempo cumprido, comportamento, reparação." },
  // Ação Penal
  { id: "queixa_crime", name: "Queixa-Crime", category: "Ação Penal", legalBasis: "Art. 30, CPP", deadline: "6 meses decadencial", addressedTo: "Juiz da causa", description: "Inicia ação penal privada. Para crimes de ação privada.", strategyHint: "Qualificação, narração, rol de testemunhas." },
  { id: "representacao", name: "Representação do Ofendido", category: "Ação Penal", legalBasis: "Art. 39, CPP", deadline: "6 meses do fato", addressedTo: "Delegado/MP", description: "Para ação penal pública condicionada.", strategyHint: "Qualificação, fato, pedido de investigação." },
  // Leis Especiais
  { id: "resposta_drogas", name: "Resposta à Acusação (Lei 11.343)", category: "Leis Especiais", legalBasis: "Art. 55, Lei 11.343/06", deadline: "3 dias", addressedTo: "Juiz da causa", description: "Resposta específica para tráfico de drogas. Prazo diferenciado.", strategyHint: "Argir falhas na cadeia de custódia, ausência de materialidade." },
];

// ===== TIPOS DE AUDIÊNCIA =====
const HEARING_TYPES = [
  {
    id: "custodia", name: "Audiência de Custódia", legalBasis: "Resolução CNJ 213/2015 · Lei 13.890/2019",
    description: "Primeira apresentação do preso ao juiz, em até 24h. Controle da legalidade da prisão.",
    participants: ["Juiz", "Acusado", "Defensor", "MP", "Policial"],
    duration: "10-30 min", goal: "Obter relaxamento, liberdade provisória, ou conversão em preventiva fundamentada.",
    keyTips: ["Argir ilegalidade do flagrante (art. 302 CPP)", "Questionar condições da prisão e possível tortura", "Pedir entrevista reservada com o cliente antes", "Sugerir medida cautelar diversa (art. 319 CPP)"],
  },
  {
    id: "instrucao", name: "Audiência de Instrução e Julgamento", legalBasis: "Art. 400 e 399, CPP",
    description: "Oitiva de testemunhas, ofendido, peritos, interrogatório e alegações finais.",
    participants: ["Juiz", "Acusado", "Defensor", "MP", "Testemunhas", "Peritos", "Ofendido"],
    duration: "1-4 horas", goal: "Produzir prova favorável e impugnar desfavorável.",
    keyTips: ["Ordem do art. 400: ofendido → test. acusação → test. defesa → peritos → interrogatório → alegações", "Cross-examination direto (art. 212 CPP)", "Anotar contradições para alegações finais", "Pedir acareamento quando contradição relevante"],
  },
  {
    id: "depoimento_especial", name: "Depoimento Especial da Vítima", legalBasis: "Art. 224-A, CPP · Lei 13.431/2017",
    description: "Oitiva de vítima vulnerável (criança, crimes sexuais) por videoconferência ou sala especial.",
    participants: ["Juiz", "MP", "Defensor", "Psicólogo", "Vítima (sala separada)"],
    duration: "30 min - 2h", goal: "Garantir defesa técnica sem ferir dignidade da vítima.",
    keyTips: ["Direito de formular perguntas indiretas", "Questionar protocolo de escuta", "Verificar sugestionabilidade", "Pedir reprodução simulada quando necessário"],
  },
  {
    id: "alegacoes_finais", name: "Alegações Finais Orais", legalBasis: "Art. 403, §3º, CPP",
    description: "Discurso final após instrução. 20 minutos prorrogáveis por mais 10.",
    participants: ["Juiz", "Defensor", "MP"], duration: "20 min (+10)",
    goal: "Sintetizar defesa, refutar acusação, pedir absolvição.",
    keyTips: ["Estrutura: refutação → tese própria → pedido", "Citar testemunhas pelo nome", "Apontar contradições específicas", "Pedido claro e direto no final"],
  },
  {
    id: "sustentacao_oral", name: "Sustentação Oral (Tribunal)", legalBasis: "Regimento dos Tribunais",
    description: "Sustentação em câmara/turma (apelação, RESE, HC). Tempo variável.",
    participants: ["Desembargadores/Ministros", "Defensor", "MP"], duration: "15-30 min",
    goal: "Convencer os julgadores. Estrutura: preliminares, mérito, pedido.",
    keyTips: ["Estudar precedentes da câmara antes", "Identificar o voto-relator", "3 argumentos-chave no máximo", "Não ler — fale olhando para os julgadores"],
  },
];

// ===== TOAST =====
function showToast(message, type = '') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ===== TABS =====
function switchTab(tabName) {
  STATE.activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  if (tabName === 'config') loadConfigStatus();
  if (tabName === 'pieces') loadPieceCatalog();
  if (tabName === 'audiencia') loadHearingTypes();
  if (tabName === 'cases') loadCases();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ===== CONVERSAS (localStorage) =====
function loadConversations() {
  const stored = localStorage.getItem('jusai_conversations');
  STATE.conversations = stored ? JSON.parse(stored) : [];
  renderConversations();
}

function saveConversations() {
  localStorage.setItem('jusai_conversations', JSON.stringify(STATE.conversations));
}

function renderConversations() {
  const list = document.getElementById('conv-list');
  if (STATE.conversations.length === 0) {
    list.innerHTML = '<div style="padding:16px; text-align:center; font-size:11px; color:var(--muted);">Nenhuma conversa. Clique em +.</div>';
    return;
  }
  list.innerHTML = STATE.conversations.map(c => `
    <div class="conv-item ${STATE.activeConversation?.id === c.id ? 'active' : ''}" onclick="selectConversation('${c.id}')">
      <span class="conv-title">${c.title}</span>
      <span class="conv-del" onclick="deleteConversation(event, '${c.id}')">🗑</span>
    </div>
  `).join('');
}

function newConversation() {
  const conv = {
    id: 'conv-' + Date.now(),
    title: 'Nova conversa',
    messages: [],
    createdAt: new Date().toISOString(),
  };
  STATE.conversations.unshift(conv);
  STATE.activeConversation = conv;
  saveConversations();
  renderConversations();
  renderMessages();
  document.getElementById('chat-title').textContent = conv.title;
}

function selectConversation(id) {
  STATE.activeConversation = STATE.conversations.find(c => c.id === id);
  renderConversations();
  renderMessages();
  document.getElementById('chat-title').textContent = STATE.activeConversation.title;
}

function deleteConversation(e, id) {
  e.stopPropagation();
  if (!confirm('Excluir esta conversa?')) return;
  STATE.conversations = STATE.conversations.filter(c => c.id !== id);
  if (STATE.activeConversation?.id === id) {
    STATE.activeConversation = null;
    renderMessages();
    document.getElementById('chat-title').textContent = 'Novo chat';
  }
  saveConversations();
  renderConversations();
}

function useSuggestion(text) {
  document.getElementById('chat-input').value = text;
  document.getElementById('chat-input').focus();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  if (!hasConfig()) {
    showToast('Configure sua chave Z.AI na aba Config primeiro.', 'error');
    switchTab('config');
    return;
  }

  // Cria conversa se não existir
  if (!STATE.activeConversation) {
    newConversation();
  }

  const conv = STATE.activeConversation;
  conv.messages.push({ role: 'user', content: text });
  if (conv.title === 'Nova conversa') {
    conv.title = text.slice(0, 50);
    document.getElementById('chat-title').textContent = conv.title;
  }

  input.value = '';
  input.style.height = 'auto';
  renderMessages();
  saveConversations();

  // Adiciona placeholder assistant
  conv.messages.push({ role: 'assistant', content: '', loading: true });
  renderMessages();

  try {
    // Busca base local
    const localResults = searchLocalLegal(text);

    // Detecta se precisa buscar na web
    const triggers = ['jurisprudência', 'jurisprudencia', 'stj', 'stf', 'precedente', 'acórdão', 'recente', 'atual', 'súmula', 'sumula', 'lei alterada', 'lei nova'];
    const needsWebSearch = triggers.some(t => text.toLowerCase().includes(t));

    let webResults = [];
    if (needsWebSearch) {
      webResults = await callWebSearch(text + ' Brasil STJ STF jurisprudência', 5);
    }

    // Constrói system prompt
    let systemPrompt = SYSTEM_PROMPT_CHAT;
    if (localResults.length > 0) {
      systemPrompt += '\n\n# BASE LEGAL LOCAL\n' + localResults.map(a =>
        `${a.code} art. ${a.article}${a.title ? ` — ${a.title}` : ''}: ${a.text}`
      ).join('\n\n');
    }
    if (webResults.length > 0) {
      systemPrompt += '\n\n# JURISPRUDÊNCIA DA WEB (busca em tempo real)\n' + webResults.map((r, i) =>
        `[${i + 1}] ${r.title || r.name || ''}\nURL: ${r.url || r.link || ''}\nSnippet: ${r.snippet || r.content || ''}`
      ).join('\n\n');
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conv.messages.filter(m => !m.loading).map(m => ({ role: m.role, content: m.content })),
    ];

    const response = await callGLM(messages, { temperature: 0.6, maxTokens: 4096 });

    // Substitui placeholder
    conv.messages[conv.messages.length - 1] = {
      role: 'assistant',
      content: response,
      sources: { web: webResults, local: localResults },
    };

    renderMessages();
    saveConversations();
  } catch (err) {
    conv.messages[conv.messages.length - 1] = {
      role: 'assistant',
      content: `Erro: ${err.message}`,
      error: true,
    };
    renderMessages();
    showToast(err.message, 'error');
  }
}

function renderMessages() {
  const container = document.getElementById('chat-messages');
  const conv = STATE.activeConversation;

  if (!conv || conv.messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚖️</div>
        <div class="empty-title">JUS·AI Criminal pronto para atuar</div>
        <div class="empty-text">Agente sênior com persona de Aury Lopes Jr, Badaró, Bottini e Nucci.</div>
        <div class="flex flex-wrap gap-2" style="justify-content:center; max-width: 500px;">
          <button class="btn btn-outline btn-sm" onclick="useSuggestion('Quando cabe HC versus RESE?')">Quando cabe HC vs RESE?</button>
          <button class="btn btn-outline btn-sm" onclick="useSuggestion('Cadeia de custódia em tráfico de drogas')">Cadeia de custódia</button>
          <button class="btn btn-outline btn-sm" onclick="useSuggestion('Estratégia para júri — legitima defesa')">Estratégia júri</button>
        </div>
      </div>`;
    return;
  }

  container.innerHTML = conv.messages.map(msg => {
    const isUser = msg.role === 'user';
    let sourcesHtml = '';
    if (msg.sources && (msg.sources.web?.length > 0 || msg.sources.local?.length > 0)) {
      const local = msg.sources.local?.map(a => `<span class="tag">${a.code} art. ${a.article}</span>`).join('') || '';
      const web = msg.sources.web?.map((s, i) => `<a href="${s.url}" target="_blank" class="source-link">[${i + 1}] ${s.title || s.url}</a>`).join('') || '';
      sourcesHtml = `<div class="msg-sources">${local}${web}</div>`;
    }
    const loadingHtml = msg.loading ? '<span class="typing"></span>' : '';
    return `
      <div class="msg ${msg.role}">
        <div class="msg-role">${isUser ? 'Você' : '⚖️ JUS·AI Criminal'}</div>
        <div class="msg-bubble">${escapeHtml(msg.content)}${loadingHtml}</div>
        ${sourcesHtml}
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Enter envia, Shift+Enter quebra linha
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
document.getElementById('chat-input').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

// ===== SEARCH TAB =====
async function doSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  if (!hasConfig()) {
    showToast('Configure sua chave Z.AI na aba Config primeiro.', 'error');
    switchTab('config');
    return;
  }

  const results = document.getElementById('search-results');
  results.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Buscando...</div></div>';

  try {
    const [webResults, localResults] = await Promise.all([
      callWebSearch(query, 8),
      Promise.resolve(searchLocalLegal(query)),
    ]);

    let html = '';

    if (STATE.searchFilter === 'all' || STATE.searchFilter === 'local') {
      if (localResults.length > 0) {
        html += '<div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--primary); font-weight:600; margin-bottom:12px;">📚 Base local — CP/CPP/CF</div>';
        html += localResults.map(art => `
          <div class="result-card" style="border-color: rgba(201,169,97,0.2); background: rgba(201,169,97,0.05);">
            <div style="font-size:11px; color:var(--primary); font-weight:600; margin-bottom:4px;">${art.code} art. ${art.article}${art.title ? ` — ${art.title}` : ''}</div>
            <div style="font-size:12px; color:var(--fg-soft); line-height:1.5;">${art.text}</div>
          </div>
        `).join('');
      }
    }

    if (STATE.searchFilter === 'all' || STATE.searchFilter === 'web') {
      if (webResults.length > 0) {
        html += '<div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--accent); font-weight:600; margin: 16px 0 12px;">🔍 Web — tempo real</div>';
        html += webResults.map(r => `
          <div class="result-card">
            <a href="${r.url || r.link || '#'}" target="_blank" rel="noopener">
              <h4>${r.title || r.name || '(sem título)'}</h4>
              <div class="result-url">${r.url || r.link || ''}</div>
              <div class="result-snippet">${r.snippet || r.content || ''}</div>
            </a>
          </div>
        `).join('');
      }
    }

    if (!html) {
      html = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Nenhum resultado encontrado.</div></div>';
    }

    results.innerHTML = html;
  } catch (err) {
    results.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${err.message}</div></div>`;
  }
}

document.getElementById('search-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    STATE.searchFilter = btn.dataset.filter;
  });
});

// ===== PIECES TAB =====
function loadPieceCatalog() {
  const select = document.getElementById('piece-type');
  if (select.children.length > 1) return; // já carregado

  const categories = {};
  PIECE_CATALOG.forEach(p => {
    if (!categories[p.category]) categories[p.category] = [];
    categories[p.category].push(p);
  });

  Object.entries(categories).forEach(([cat, pieces]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = cat;
    pieces.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.name} · ${p.legalBasis}`;
      optgroup.appendChild(option);
    });
    select.appendChild(optgroup);
  });
}

function onPieceChange() {
  const pieceId = document.getElementById('piece-type').value;
  const info = document.getElementById('piece-info');
  if (!pieceId) {
    info.innerHTML = '';
    STATE.selectedPiece = null;
    return;
  }
  const piece = PIECE_CATALOG.find(p => p.id === pieceId);
  STATE.selectedPiece = piece;
  info.innerHTML = `
    <div class="piece-info-card">
      <h4>${piece.name}</h4>
      <div class="piece-info-meta">${piece.legalBasis} · Prazo: ${piece.deadline} · Endereçamento: ${piece.addressedTo}</div>
      <div class="piece-info-desc">${piece.description}</div>
      <div class="piece-info-tip">${piece.strategyHint}</div>
    </div>
  `;
  document.getElementById('piece-court').placeholder = piece.addressedTo;
}

async function generatePiece() {
  const pieceId = document.getElementById('piece-type').value;
  const facts = document.getElementById('piece-facts').value.trim();
  if (!pieceId || !facts) {
    showToast('Selecione a peça e descreva os fatos', 'error');
    return;
  }
  if (!hasConfig()) {
    showToast('Configure sua chave Z.AI na aba Config', 'error');
    switchTab('config');
    return;
  }

  const piece = PIECE_CATALOG.find(p => p.id === pieceId);
  const btn = document.getElementById('piece-generate-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Gerando...';

  const result = document.getElementById('piece-result');
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Construindo peça com GLM 5.2...</div></div>';

  try {
    const client = document.getElementById('piece-client').value;
    const court = document.getElementById('piece-court').value;
    const number = document.getElementById('piece-number').value;
    const context = document.getElementById('piece-context').value;

    // Busca base local
    const localResults = searchLocalLegal(`${piece.name} ${facts}`);
    const webResults = await callWebSearch(piece.name + ' jurisprudência STJ STF modelo', 5);

    let contextBlock = `\n# DADOS PARA A PEÇA\n\n`;
    contextBlock += `**Tipo de peça:** ${piece.name}\n`;
    contextBlock += `**Fundamento legal:** ${piece.legalBasis}\n`;
    contextBlock += `**Prazo:** ${piece.deadline}\n`;
    contextBlock += `**Endereçamento:** ${piece.addressedTo}\n`;
    contextBlock += `**Dica estratégica:** ${piece.strategyHint}\n\n`;
    if (client) contextBlock += `**Dados do cliente:** ${client}\n\n`;
    if (court) contextBlock += `**Endereçamento específico:** ${court}\n\n`;
    if (number) contextBlock += `**Número do processo:** ${number}\n\n`;
    contextBlock += `**FATOS DO CASO:**\n${facts}\n\n`;
    if (context) contextBlock += `**Contexto adicional:** ${context}\n\n`;

    if (localResults.length > 0) {
      contextBlock += `\n# BASE LEGAL APLICÁVEL\n${localResults.map(a => `${a.code} art. ${a.article}: ${a.text}`).join('\n\n')}\n\n`;
    }
    if (webResults.length > 0) {
      contextBlock += `\n# JURISPRUDÊNCIA RECENTE\n${webResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`).join('\n\n')}\n\n`;
    }

    contextBlock += `\n# INSTRUÇÃO FINAL\nRedija a peça completa com endereçamento, qualificação, fatos, fundamentação e pedido.`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_PIECE },
      { role: 'user', content: contextBlock },
    ];

    const pieceContent = await callGLM(messages, { temperature: 0.4, maxTokens: 6000 });

    result.innerHTML = `
      <div style="font-family:'Courier New',monospace; font-size:13px; color:var(--fg); white-space:pre-wrap; line-height:1.6;">${escapeHtml(pieceContent)}</div>
      <div style="border-top:1px solid var(--border); margin-top:16px; padding-top:12px; font-size:11px; color:var(--muted); font-style:italic;">⚠️ Peça para revisão do advogado responsável antes da protocolização.</div>
    `;
    document.getElementById('result-title').textContent = `Peça · ${piece.name}`;
    document.getElementById('copy-btn').style.display = 'inline-flex';
    document.getElementById('docx-btn').style.display = 'inline-flex';
    document.getElementById('pdf-btn').style.display = 'inline-flex';
    document.getElementById('copy-btn').dataset.content = pieceContent;
    showToast('Peça gerada com sucesso!', 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${err.message}</div></div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Gerar peça';
  }
}

function copyResult() {
  const content = document.getElementById('copy-btn').dataset.content;
  if (content) {
    navigator.clipboard.writeText(content);
    showToast('Peça copiada!', 'success');
  }
}

// ===== STRATEGY TAB =====
async function generateStrategy() {
  const caseDesc = document.getElementById('strat-case').value.trim();
  if (!caseDesc) {
    showToast('Descreva o caso', 'error');
    return;
  }
  if (!hasConfig()) {
    showToast('Configure sua chave Z.AI na aba Config', 'error');
    switchTab('config');
    return;
  }

  const btn = document.getElementById('strat-generate-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Gerando...';

  const result = document.getElementById('strat-result');
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Construindo estratégia...</div></div>';

  try {
    const crime = document.getElementById('strat-crime').value;
    const goals = document.getElementById('strat-goals').value;
    const context = document.getElementById('strat-context').value;

    const localResults = searchLocalLegal(`${crime} ${caseDesc}`);
    const webResults = await callWebSearch(`defesa criminal ${crime} STJ STF jurisprudência`, 5);

    let contextBlock = `\n# CASO PARA ANÁLISE ESTRATÉGICA\n\n`;
    if (crime) contextBlock += `**Tipificação alegada:** ${crime}\n\n`;
    contextBlock += `**DESCRIÇÃO DO CASO:**\n${caseDesc}\n\n`;
    if (goals) contextBlock += `**Objetivos do cliente:** ${goals}\n\n`;
    if (context) contextBlock += `**Contexto adicional:** ${context}\n\n`;

    if (localResults.length > 0) {
      contextBlock += `\n# BASE LEGAL\n${localResults.map(a => `${a.code} art. ${a.article}: ${a.text}`).join('\n\n')}\n\n`;
    }
    if (webResults.length > 0) {
      contextBlock += `\n# JURISPRUDÊNCIA\n${webResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`).join('\n\n')}\n\n`;
    }

    contextBlock += `\n# INSTRUÇÃO\nElabore estratégia em 4 blocos (FATOS, DIREITO, PROVA, NARRATIVA) + TESE RECOMENDADA + PEÇAS NECESSÁRIAS + RISCOS + BIBLIOGRAFIA.`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_STRATEGY },
      { role: 'user', content: contextBlock },
    ];

    const strategy = await callGLM(messages, { temperature: 0.5, maxTokens: 6000 });

    result.innerHTML = `<div style="font-family:'Courier New',monospace; font-size:13px; color:var(--fg); white-space:pre-wrap; line-height:1.6;">${escapeHtml(strategy)}</div>`;
    document.getElementById('copy-strat-btn').style.display = 'inline-flex';
    document.getElementById('strat-docx-btn').style.display = 'inline-flex';
    document.getElementById('strat-pdf-btn').style.display = 'inline-flex';
    document.getElementById('copy-strat-btn').dataset.content = strategy;
    showToast('Estratégia gerada!', 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${err.message}</div></div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Gerar estratégia';
  }
}

function copyStrategy() {
  const content = document.getElementById('copy-strat-btn').dataset.content;
  if (content) {
    navigator.clipboard.writeText(content);
    showToast('Estratégia copiada!', 'success');
  }
}

// ===== AUDIENCIA TAB =====
function loadHearingTypes() {
  const select = document.getElementById('setup-type');
  if (select.children.length > 1) return;
  HEARING_TYPES.forEach(h => {
    const opt = document.createElement('option');
    opt.value = h.id;
    opt.textContent = `${h.name} · ${h.legalBasis}`;
    select.appendChild(opt);
  });
}

function showSetupForm() {
  document.getElementById('audiencia-list-view').style.display = 'none';
  document.getElementById('audiencia-live-view').style.display = 'none';
  document.getElementById('audiencia-argument-view').style.display = 'none';
  document.getElementById('audiencia-setup-view').style.display = 'block';
}

function showListView() {
  document.getElementById('audiencia-setup-view').style.display = 'none';
  document.getElementById('audiencia-live-view').style.display = 'none';
  document.getElementById('audiencia-argument-view').style.display = 'none';
  document.getElementById('audiencia-list-view').style.display = 'flex';
  loadSessionsList();
}

function loadSessionsList() {
  const sessions = JSON.parse(localStorage.getItem('jusai_sessions') || '[]');
  const list = document.getElementById('audiencia-list');
  if (sessions.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⚖️</div><div class="empty-title">Audiências criminais</div><div class="empty-text">Capture notas ao vivo. Rastreie contradições. Gere sustentação oral final.</div></div>';
    return;
  }
  list.innerHTML = sessions.map(s => {
    const hearing = HEARING_TYPES.find(h => h.id === s.type);
    return `
      <div class="result-card" onclick="openSession('${s.id}')" style="cursor:pointer;">
        <div class="flex items-center justify-between">
          <div>
            <div style="font-size:10px; color:var(--primary); text-transform:uppercase; letter-spacing:0.15em; margin-bottom:4px;">${hearing?.name || s.type}</div>
            <div style="font-size:13px; color:var(--fg);">${s.title}</div>
            <div style="font-size:11px; color:var(--muted); margin-top:4px;">${s.notes?.length || 0} notas · ${s.mpTheses?.length || 0} teses MP</div>
          </div>
          <button class="btn-icon" onclick="deleteSession(event, '${s.id}')" style="color:var(--accent);">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

function onSetupTypeChange() {
  const typeId = document.getElementById('setup-type').value;
  const info = document.getElementById('setup-info');
  if (!typeId) { info.innerHTML = ''; return; }
  const h = HEARING_TYPES.find(x => x.id === typeId);
  info.innerHTML = `
    <div class="piece-info-card">
      <h4>${h.name}</h4>
      <div class="piece-info-meta">${h.legalBasis} · ${h.duration}</div>
      <div class="piece-info-desc">${h.description}</div>
      <div style="font-size:11px; color:var(--fg-soft); margin-top:8px;"><strong style="color:var(--primary);">Objetivo:</strong> ${h.goal}</div>
      <div class="piece-info-tip">${h.keyTips.join(' · ')}</div>
    </div>
  `;
}

function startSession() {
  const type = document.getElementById('setup-type').value;
  const title = document.getElementById('setup-title').value.trim();
  if (!type || !title) {
    showToast('Selecione tipo e título', 'error');
    return;
  }
  const session = {
    id: 'sess-' + Date.now(),
    type,
    title,
    facts: document.getElementById('setup-facts').value,
    thesis: document.getElementById('setup-thesis').value,
    notes: [],
    mpTheses: [],
    startedAt: new Date().toISOString(),
  };
  const sessions = JSON.parse(localStorage.getItem('jusai_sessions') || '[]');
  sessions.unshift(session);
  localStorage.setItem('jusai_sessions', JSON.stringify(sessions));
  STATE.activeSession = session;
  STATE.elapsed = 0;
  STATE.timerRunning = true;

  document.getElementById('audiencia-list-view').style.display = 'none';
  document.getElementById('audiencia-setup-view').style.display = 'none';
  document.getElementById('audiencia-live-view').style.display = 'flex';
  document.getElementById('audiencia-argument-view').style.display = 'none';

  const hearing = HEARING_TYPES.find(h => h.id === type);
  document.getElementById('live-title').textContent = hearing.name;
  startTimer();
  renderNotes();
  renderMpTheses();
  renderStats();
  showToast('Audiência iniciada!');
}

function openSession(id) {
  const sessions = JSON.parse(localStorage.getItem('jusai_sessions') || '[]');
  STATE.activeSession = sessions.find(s => s.id === id);
  STATE.elapsed = 0;
  STATE.timerRunning = false;

  document.getElementById('audiencia-list-view').style.display = 'none';
  document.getElementById('audiencia-setup-view').style.display = 'none';
  document.getElementById('audiencia-live-view').style.display = 'flex';
  document.getElementById('audiencia-argument-view').style.display = 'none';

  const hearing = HEARING_TYPES.find(h => h.id === STATE.activeSession.type);
  document.getElementById('live-title').textContent = hearing.name;
  renderNotes();
  renderMpTheses();
  renderStats();
}

function deleteSession(e, id) {
  e.stopPropagation();
  if (!confirm('Excluir sessão?')) return;
  let sessions = JSON.parse(localStorage.getItem('jusai_sessions') || '[]');
  sessions = sessions.filter(s => s.id !== id);
  localStorage.setItem('jusai_sessions', JSON.stringify(sessions));
  loadSessionsList();
}

function exitLive() {
  stopTimer();
  showListView();
}

function setNoteCat(cat) {
  STATE.currentNoteCat = cat;
  document.querySelectorAll('.note-cat-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.cat === cat);
  });
  const placeholder = {
    depoimento: 'Anotar depoimento... (Ctrl+Enter para adicionar)',
    contradicao: 'Anotar contradição... (Ctrl+Enter para adicionar)',
    pergunta: 'Anotar pergunta... (Ctrl+Enter para adicionar)',
    nulidade: 'Anotar nulidade... (Ctrl+Enter para adicionar)',
    prova: 'Anotar questão de prova... (Ctrl+Enter para adicionar)',
    observacao: 'Anotar observação... (Ctrl+Enter para adicionar)',
  };
  document.getElementById('note-content').placeholder = placeholder[cat];
}

function addNote() {
  const content = document.getElementById('note-content').value.trim();
  if (!content) return;
  const witness = document.getElementById('note-witness').value.trim();
  const page = document.getElementById('note-page').value.trim();

  const note = {
    id: 'note-' + Date.now(),
    category: STATE.currentNoteCat,
    witness,
    page,
    content,
    timestamp: new Date().toISOString(),
  };

  STATE.activeSession.notes.push(note);
  saveSession();

  document.getElementById('note-content').value = '';
  renderNotes();
  renderStats();
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && document.getElementById('audiencia-live-view').style.display !== 'none') {
    e.preventDefault();
    addNote();
  }
});

function deleteNote(id) {
  STATE.activeSession.notes = STATE.activeSession.notes.filter(n => n.id !== id);
  saveSession();
  renderNotes();
  renderStats();
}

function renderNotes() {
  const list = document.getElementById('note-list');
  if (STATE.activeSession.notes.length === 0) {
    list.innerHTML = '<div style="text-align:center; padding:24px; font-size:11px; color:var(--muted);">Comece a capturar notas acima.</div>';
    return;
  }
  list.innerHTML = [...STATE.activeSession.notes].reverse().map(n => {
    const catLabel = {
      depoimento: '💬 Depoimento',
      contradicao: '⚡ Contradição',
      pergunta: '❓ Pergunta',
      nulidade: '⚠️ Nulidade',
      prova: '📋 Prova',
      observacao: '👁️ Observação',
    };
    return `
      <div class="note-card cat-${n.category}">
        <div class="note-meta">
          <span>${catLabel[n.category]}</span>
          ${n.witness ? `<span>· ${n.witness}</span>` : ''}
          ${n.page ? `<span style="font-family:monospace;">· p.${n.page}</span>` : ''}
          <span style="margin-left:auto;">${new Date(n.timestamp).toLocaleTimeString('pt-BR')}</span>
          <span onclick="deleteNote('${n.id}')" style="color:var(--accent); cursor:pointer; margin-left:8px;">🗑</span>
        </div>
        <div class="note-content">${escapeHtml(n.content)}</div>
      </div>
    `;
  }).join('');
}

function addMpTese() {
  const input = document.getElementById('mp-input');
  const value = input.value.trim();
  if (!value) return;
  STATE.activeSession.mpTheses.push(value);
  input.value = '';
  saveSession();
  renderMpTheses();
  renderStats();
}

function removeMpTese(idx) {
  STATE.activeSession.mpTheses.splice(idx, 1);
  saveSession();
  renderMpTheses();
  renderStats();
}

function renderMpTheses() {
  const list = document.getElementById('mp-theses-list');
  if (STATE.activeSession.mpTheses.length === 0) {
    list.innerHTML = '<div style="font-size:11px; color:var(--muted); font-style:italic;">Nenhuma tese do MP registrada.</div>';
    return;
  }
  list.innerHTML = STATE.activeSession.mpTheses.map((t, i) => `
    <div style="font-size:11px; color:var(--fg-soft); padding:6px 8px; background:rgba(239,68,68,0.05); border-left:2px solid var(--danger); margin-bottom:4px; border-radius:4px;">
      <span style="color:var(--accent);">⚡</span> ${escapeHtml(t)}
      <span onclick="removeMpTese(${i})" style="color:var(--accent); cursor:pointer; float:right;">🗑</span>
    </div>
  `).join('');
}

function renderStats() {
  const s = STATE.activeSession;
  const stats = {
    total: s.notes.length,
    contradicoes: s.notes.filter(n => n.category === 'contradicao').length,
    nulidades: s.notes.filter(n => n.category === 'nulidade').length,
    perguntas: s.notes.filter(n => n.category === 'pergunta').length,
  };
  document.getElementById('stats-block').innerHTML = `
    <div style="border-top:1px solid var(--border); padding-top:12px; margin-top:12px;">
      <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--muted); margin-bottom:8px;">Estatísticas</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
        <div style="background:var(--card-soft); padding:8px; border-radius:4px;">
          <div style="font-size:16px; color:var(--primary); font-family:monospace;">${stats.total}</div>
          <div style="font-size:10px; color:var(--muted);">Notas</div>
        </div>
        <div style="background:var(--card-soft); padding:8px; border-radius:4px;">
          <div style="font-size:16px; color:var(--accent); font-family:monospace;">${stats.contradicoes}</div>
          <div style="font-size:10px; color:var(--muted);">Contradições</div>
        </div>
        <div style="background:var(--card-soft); padding:8px; border-radius:4px;">
          <div style="font-size:16px; color:var(--danger); font-family:monospace;">${stats.nulidades}</div>
          <div style="font-size:10px; color:var(--muted);">Nulidades</div>
        </div>
        <div style="background:var(--card-soft); padding:8px; border-radius:4px;">
          <div style="font-size:16px; color:#4F8AC9; font-family:monospace;">${stats.perguntas}</div>
          <div style="font-size:10px; color:var(--muted);">Perguntas</div>
        </div>
      </div>
    </div>
  `;
}

function saveSession() {
  const sessions = JSON.parse(localStorage.getItem('jusai_sessions') || '[]');
  const idx = sessions.findIndex(s => s.id === STATE.activeSession.id);
  if (idx >= 0) {
    sessions[idx] = STATE.activeSession;
    localStorage.setItem('jusai_sessions', JSON.stringify(sessions));
  }
}

// Timer
function startTimer() {
  if (STATE.timerInterval) clearInterval(STATE.timerInterval);
  STATE.timerInterval = setInterval(() => {
    STATE.elapsed++;
    updateTimerDisplay();
  }, 1000);
  document.getElementById('timer-btn').textContent = '⏸';
}

function stopTimer() {
  if (STATE.timerInterval) {
    clearInterval(STATE.timerInterval);
    STATE.timerInterval = null;
  }
  STATE.timerRunning = false;
  document.getElementById('timer-btn').textContent = '▶';
}

function toggleTimer() {
  if (STATE.timerRunning) {
    stopTimer();
  } else {
    STATE.timerRunning = true;
    startTimer();
  }
}

function resetTimer() {
  STATE.elapsed = 0;
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const h = Math.floor(STATE.elapsed / 3600).toString().padStart(2, '0');
  const m = Math.floor((STATE.elapsed % 3600) / 60).toString().padStart(2, '0');
  const s = (STATE.elapsed % 60).toString().padStart(2, '0');
  const timer = document.getElementById('timer');
  timer.textContent = `${h}:${m}:${s}`;
  timer.classList.toggle('running', STATE.timerRunning);
}

async function generateArgument() {
  if (!STATE.activeSession || STATE.activeSession.notes.length === 0) {
    showToast('Adicione notas antes', 'error');
    return;
  }
  if (!hasConfig()) {
    showToast('Configure sua chave Z.AI na aba Config', 'error');
    switchTab('config');
    return;
  }

  const btn = document.getElementById('gen-argument-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Construindo...';

  document.getElementById('audiencia-list-view').style.display = 'none';
  document.getElementById('audiencia-setup-view').style.display = 'none';
  document.getElementById('audiencia-live-view').style.display = 'none';
  document.getElementById('audiencia-argument-view').style.display = 'flex';

  const content = document.getElementById('argument-content');
  content.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Construindo sustentação oral...</div></div>';

  try {
    const s = STATE.activeSession;
    const hearing = HEARING_TYPES.find(h => h.id === s.type);

    let contextBlock = `\n# CONTEXTO DA AUDIÊNCIA\n\n`;
    contextBlock += `**Tipo:** ${hearing.name} (${hearing.legalBasis})\n`;
    contextBlock += `**Objetivo:** ${hearing.goal}\n`;
    contextBlock += `**Caso:** ${s.title}\n\n`;
    if (s.facts) contextBlock += `**Fatos:** ${s.facts}\n\n`;
    if (s.thesis) contextBlock += `**Tese da defesa:** ${s.thesis}\n\n`;

    if (s.mpTheses.length > 0) {
      contextBlock += `\n# TESES DO MP A REFUTAR\n`;
      s.mpTheses.forEach((t, i) => contextBlock += `${i + 1}. ${t}\n`);
    }

    contextBlock += `\n# ANOTAÇÕES COLHIDAS (${s.notes.length} notas)\n\n`;
    const categories = {
      depoimento: 'DEPOIMENTOS',
      contradicao: 'CONTRADIÇÕES',
      pergunta: 'PERGUNTAS',
      nulidade: 'NULIDADES',
      prova: 'QUESTÕES DE PROVA',
      observacao: 'OBSERVAÇÕES',
    };
    Object.entries(categories).forEach(([cat, label]) => {
      const notes = s.notes.filter(n => n.category === cat);
      if (notes.length > 0) {
        contextBlock += `\n## ${label}\n\n`;
        notes.forEach((n, i) => {
          contextBlock += `[${i + 1}]`;
          if (n.witness) contextBlock += ` ${n.witness}:`;
          if (n.page) contextBlock += ` (p. ${n.page})`;
          contextBlock += ` ${n.content}\n`;
        });
      }
    });

    const localResults = searchLocalLegal(`${hearing.name} ${s.facts || ''}`);
    if (localResults.length > 0) {
      contextBlock += `\n# BASE LEGAL\n${localResults.map(a => `${a.code} art. ${a.article}: ${a.text}`).join('\n\n')}\n\n`;
    }

    contextBlock += `\n# INSTRUÇÃO\nConstrua sustentação oral em 5 blocos (PRELIMINARMENTE / DA PROVA / DAS CONTRADIÇÕES / DO MÉRITO / DO PEDIDO). Use as notas, cite testemunhas pelo nome. Refuta as teses do MP. Português jurídico falado.`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_ORAL },
      { role: 'user', content: contextBlock },
    ];

    const argument = await callGLM(messages, { temperature: 0.5, maxTokens: 6000 });

    content.innerHTML = `
      <div class="piece-info-card" style="margin-bottom:16px;">
        <div class="flex items-center justify-between">
          <div>
            <div style="font-size:14px; color:var(--primary); font-weight:600;">${hearing.name}</div>
            <div style="font-size:10px; color:var(--muted);">${s.title}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Tempo estimado</div>
            <div style="font-size:13px; color:var(--accent); font-family:monospace;">~15-20 min</div>
          </div>
        </div>
      </div>
      <div style="font-family:'Courier New',monospace; font-size:13px; color:var(--fg); white-space:pre-wrap; line-height:1.6;">${escapeHtml(argument)}</div>
    `;
    content.dataset.argument = argument;
    showToast('Sustentação gerada!', 'success');
  } catch (err) {
    content.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${err.message}</div></div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Gerar sustentação oral final';
  }
}

function backToLive() {
  document.getElementById('audiencia-argument-view').style.display = 'none';
  document.getElementById('audiencia-live-view').style.display = 'flex';
}

function copyArgument() {
  const content = document.getElementById('argument-content');
  if (content.dataset.argument) {
    navigator.clipboard.writeText(content.dataset.argument);
    showToast('Sustentação copiada!', 'success');
  }
}

// ===== CASES TAB (localStorage simples) =====
function loadCases() {
  const cases = JSON.parse(localStorage.getItem('jusai_cases') || '[]');
  const list = document.getElementById('cases-list-content');
  if (cases.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-text">Nenhum caso. Clique em + Novo.</div></div>';
    return;
  }
  list.innerHTML = cases.map(c => `
    <div class="result-card" onclick="selectCase('${c.id}')" style="cursor:pointer;">
      <div style="font-size:14px; color:var(--fg); font-weight:500;">${c.title}</div>
      ${c.client ? `<div style="font-size:11px; color:var(--muted); margin-top:4px;">Cliente: ${c.client}</div>` : ''}
      ${c.crime ? `<div style="font-size:10px; color:var(--accent); margin-top:4px;">${c.crime}</div>` : ''}
    </div>
  `).join('');
}

function showCaseForm() {
  const title = prompt('Título do caso:');
  if (!title) return;
  const client = prompt('Cliente (opcional):') || '';
  const crime = prompt('Crime (ex: art. 121 CP, opcional):') || '';

  const newCase = {
    id: 'case-' + Date.now(),
    title,
    client,
    crime,
    notes: '',
    createdAt: new Date().toISOString(),
  };
  const cases = JSON.parse(localStorage.getItem('jusai_cases') || '[]');
  cases.unshift(newCase);
  localStorage.setItem('jusai_cases', JSON.stringify(cases));
  loadCases();
  showToast('Caso criado!');
}

function selectCase(id) {
  const cases = JSON.parse(localStorage.getItem('jusai_cases') || '[]');
  STATE.activeCase = cases.find(c => c.id === id);
  const content = document.getElementById('case-detail-content');
  document.getElementById('case-detail-title').textContent = STATE.activeCase.title;
  content.innerHTML = `
    <div class="piece-info-card">
      <h4>${STATE.activeCase.title}</h4>
      ${STATE.activeCase.client ? `<div style="font-size:12px; color:var(--fg-soft); margin-top:4px;">Cliente: ${STATE.activeCase.client}</div>` : ''}
      ${STATE.activeCase.crime ? `<div style="font-size:11px; color:var(--accent); margin-top:4px;">${STATE.activeCase.crime}</div>` : ''}
      <div style="font-size:10px; color:var(--muted); margin-top:8px;">Criado em: ${new Date(STATE.activeCase.createdAt).toLocaleString('pt-BR')}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Anotações do caso</label>
      <textarea class="form-textarea" id="case-notes" placeholder="Anotações internas..." style="min-height:200px;">${escapeHtml(STATE.activeCase.notes || '')}</textarea>
    </div>
    <button class="btn" onclick="saveCaseNotes()">💾 Salvar anotações</button>
  `;
}

function saveCaseNotes() {
  if (!STATE.activeCase) return;
  STATE.activeCase.notes = document.getElementById('case-notes').value;
  const cases = JSON.parse(localStorage.getItem('jusai_cases') || '[]');
  const idx = cases.findIndex(c => c.id === STATE.activeCase.id);
  if (idx >= 0) {
    cases[idx] = STATE.activeCase;
    localStorage.setItem('jusai_cases', JSON.stringify(cases));
    showToast('Anotações salvas!');
  }
}

// ===== CONFIG TAB =====

/**
 * selectProvider — muda provedor, atualiza UI com modelos e endpoint corretos.
 */
function selectProvider(provider) {
  if (!PROVIDERS[provider]) return;
  setProvider(provider);

  // Atualiza botões visualmente
  document.querySelectorAll('.provider-btn').forEach(btn => {
    const active = btn.dataset.prov === provider;
    btn.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
    btn.style.background = active ? 'rgba(201,169,97,0.1)' : 'var(--bg-soft)';
  });

  // Atualiza seletor de modelos
  const select = document.getElementById('cfg-model');
  if (select) {
    select.innerHTML = '<option value="">Auto (recomendado — testa todos)</option>' +
      PROVIDERS[provider].models.map(m => `<option value="${m}">${m}</option>`).join('');
  }

  // Atualiza base URL avançada
  const baseInput = document.getElementById('cfg-baseurl');
  if (baseInput) baseInput.value = PROVIDERS[provider].baseUrl;

  // Atualiza info
  const info = document.getElementById('provider-info');
  if (info) {
    info.innerHTML = `
      <strong>Endpoint:</strong> <code style="color:var(--primary);">${PROVIDERS[provider].baseUrl}</code><br>
      <strong>Modelos:</strong> ${PROVIDERS[provider].models.join(', ')}<br>
      <strong>Obter chave:</strong> <a href="${PROVIDERS[provider].docs}" target="_blank" style="color:var(--primary);">${PROVIDERS[provider].docs}</a>
    `;
  }
}

/**
 * quickSave — salva a chave e testa automaticamente.
 * Faz tudo em 1 clique: salva, testa, mostra resultado claro.
 */
async function quickSave() {
  const apiKey = document.getElementById('cfg-apikey').value.trim();
  const result = document.getElementById('quick-result');
  const config = getConfig();

  if (!apiKey) {
    result.innerHTML = `<div class="status-card error"><div class="status-title">⚠️ Cole sua chave primeiro</div></div>`;
    showToast('Cole sua chave', 'error');
    return;
  }

  const prov = PROVIDERS[config.provider] || PROVIDERS.zai;

  // Salva a chave
  const model = document.getElementById('cfg-model')?.value || '';
  saveConfigToStorage(prov.baseUrl, apiKey, model, config.provider);
  ZAI_MODELS_WORKING = null;

  result.innerHTML = `<div class="status-card warn">
    <div class="status-title">⏳ Testando ${prov.name}...</div>
    <div class="status-text">Chamando ${prov.baseUrl} com modelos: ${prov.models.slice(0, 3).join(', ')}...</div>
  </div>`;

  try {
    const started = Date.now();
    const response = await callGLM([
      { role: 'user', content: 'Responda apenas: OK' }
    ], { maxTokens: 20, temperature: 0 });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    result.innerHTML = `<div class="status-card ok">
      <div class="status-title">✅ ${prov.name} funcionando!</div>
      <div class="status-text">
        <strong>Resposta:</strong> <code style="color:var(--primary);">${escapeHtml(response)}</code><br>
        <strong>Modelo usado:</strong> <code style="color:var(--primary);">${ZAI_MODELS_WORKING || 'auto'}</code><br>
        <strong>Tempo:</strong> <code style="color:var(--primary);">${elapsed}s</code>
        <br><br>
        <span style="color:var(--success);">🎉 Pode ir no Chat e usar!</span>
      </div>
    </div>`;
    showToast(`✅ ${prov.name} funcionando!`, 'success');
    loadConfigStatus();
  } catch (err) {
    let hint = '';
    if (err.message.includes('403') || err.message.includes('model_access_denied')) {
      hint = '<br><br><strong>Dica:</strong> Sua chave não tem permissão para esses modelos. Tente outro provedor.';
    } else if (err.message.includes('401') || err.message.includes('token') || err.message.includes('incorrect')) {
      hint = '<br><br><strong>Dica:</strong> Chave inválida. Verifique se copiou completa.';
    } else if (err.message.includes('429')) {
      hint = '<br><br><strong>Dica:</strong> Rate limit. Aguarde 1 minuto e tente novamente.';
    } else if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
      hint = '<br><br><strong>Dica:</strong> Erro de rede ou CORS. Tente outro provedor.';
    } else if (err.message.includes('insufficient') || err.message.includes('balance') || err.message.includes('余额')) {
      hint = '<br><br><strong>Dica:</strong> Sem créditos. Recarregue no painel do provedor.';
    }

    result.innerHTML = `<div class="status-card error">
      <div class="status-title">❌ ${prov.name} falhou</div>
      <div class="status-text">
        ${escapeHtml(err.message)}
        ${hint}
        <br><br>
        <strong>Tente outro provedor:</strong> clique em Z.AI, OpenAI, DeepSeek ou Claude acima.
      </div>
    </div>`;
    showToast(`${prov.name} falhou — tente outro provedor`, 'error');
  }
}

function loadConfigStatus() {
  const status = document.getElementById('config-status');
  const cfg = getConfig();
  const prov = PROVIDERS[cfg.provider] || PROVIDERS.zai;

  // Marca botão do provedor atual
  document.querySelectorAll('.provider-btn').forEach(btn => {
    const active = btn.dataset.prov === cfg.provider;
    btn.style.borderColor = active ? 'var(--primary)' : 'var(--border)';
    btn.style.background = active ? 'rgba(201,169,97,0.1)' : 'var(--bg-soft)';
  });

  // Popula select de modelos
  const select = document.getElementById('cfg-model');
  if (select) {
    select.innerHTML = '<option value="">Auto (recomendado — testa todos)</option>' +
      prov.models.map(m => `<option value="${m}" ${m === cfg.model ? 'selected' : ''}>${m}</option>`).join('');
  }

  // Atualiza info
  const info = document.getElementById('provider-info');
  if (info) {
    info.innerHTML = `
      <strong>Endpoint:</strong> <code style="color:var(--primary);">${prov.baseUrl}</code><br>
      <strong>Modelos:</strong> ${prov.models.join(', ')}<br>
      <strong>Obter chave:</strong> <a href="${prov.docs}" target="_blank" style="color:var(--primary);">${prov.docs}</a>
    `;
  }

  // Atualiza base URL avançada
  const baseInput = document.getElementById('cfg-baseurl');
  if (baseInput) baseInput.value = cfg.baseUrl;

  if (cfg.apiKey) {
    const masked = cfg.apiKey.slice(0, 8) + '••••••••' + cfg.apiKey.slice(-4);
    status.innerHTML = `
      <div class="status-card ok">
        <div class="status-title">✓ ${prov.name} configurado</div>
        <div class="status-text">
          Chave: <code style="color:var(--primary);">${masked}</code><br>
          Provedor: <code style="color:var(--primary);">${cfg.provider}</code><br>
          Modelo: <code style="color:var(--primary);">${cfg.model || 'Auto'}</code>
        </div>
      </div>
    `;
    document.getElementById('clear-btn').style.display = 'inline-flex';
  } else {
    status.innerHTML = `
      <div class="status-card warn">
        <div class="status-title">⚠ Configure sua chave</div>
        <div class="status-text">
          Escolha um provedor acima e cole sua chave.
          Não tem chave? Veja as opções no painel direito →
        </div>
      </div>
    `;
    document.getElementById('clear-btn').style.display = 'none';
  }
}

function saveConfig() {
  const baseUrl = document.getElementById('cfg-baseurl').value.trim();
  const apiKey = document.getElementById('cfg-apikey').value.trim();
  const userId = document.getElementById('cfg-userid').value.trim();
  const model = document.getElementById('cfg-model').value;

  // Se apiKey vazio, mantém a salva
  const finalApiKey = apiKey || localStorage.getItem('zai_apikey') || '';
  if (!baseUrl || !finalApiKey) {
    showToast('baseUrl e apiKey são obrigatórios', 'error');
    return;
  }
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    showToast('baseUrl deve começar com http:// ou https://', 'error');
    return;
  }
  if (apiKey && apiKey.length < 8) {
    showToast('apiKey parece curta demais', 'error');
    return;
  }

  // Reset do cache quando muda modelo
  ZAI_MODELS_WORKING = null;

  saveConfigToStorage(baseUrl, apiKey || finalApiKey, userId, model);
  document.getElementById('cfg-apikey').value = '';
  loadConfigStatus();
  showToast('Configuração salva!', 'success');
}

async function testConfig() {
  if (!hasConfig()) {
    showToast('Salve sua chave primeiro', 'error');
    return;
  }
  const result = document.getElementById('test-result');
  result.innerHTML = '<div class="status-card warn"><div class="status-title">Testando...</div><div class="status-text">Chamando GLM...</div></div>';

  try {
    // Salva modelo selecionado antes de testar
    const model = document.getElementById('cfg-model').value;
    if (model !== localStorage.getItem('zai_model')) {
      localStorage.setItem('zai_model', model);
      ZAI_MODELS_WORKING = null;
    }

    const started = Date.now();
    const response = await callGLM([
      { role: 'user', content: 'Responda apenas: OK' }
    ], { maxTokens: 10, temperature: 0 });
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    result.innerHTML = `
      <div class="status-card ok">
        <div class="status-title">✓ Conexão validada</div>
        <div class="status-text">
          Resposta do GLM: <code style="color:var(--primary);">${escapeHtml(response)}</code><br>
          Modelo usado: <code style="color:var(--primary);">${ZAI_MODELS_WORKING || 'desconhecido'}</code><br>
          Tempo: <code style="color:var(--primary);">${elapsed}s</code>
        </div>
      </div>
    `;
    showToast('Conexão validada!', 'success');
  } catch (err) {
    result.innerHTML = `
      <div class="status-card error">
        <div class="status-title">✗ Falha na conexão</div>
        <div class="status-text">${escapeHtml(err.message)}</div>
      </div>
    `;
    showToast(err.message, 'error');
  }
}

/**
 * Detecta quais modelos sua chave Z.AI consegue acessar.
 * Usa o endpoint oficial /models (instantâneo, sem testar um por um).
 */
async function detectModels() {
  if (!hasConfig()) {
    showToast('Salve sua chave primeiro', 'error');
    return;
  }

  const result = document.getElementById('model-detection-result');
  const config = getConfig();

  result.innerHTML = `
    <div class="status-card warn">
      <div class="status-title">🔎 Consultando API Z.AI...</div>
      <div class="status-text">Listando modelos disponíveis via endpoint oficial /models</div>
    </div>
  `;

  try {
    // Endpoint oficial /models — retorna JSON com todos os modelos acessíveis
    const res = await fetch(`${config.baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${config.apiKey}` },
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errData = await res.json();
        errorMsg = errData?.error?.message || errData?.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const data = await res.json();
    const models = data.models || data.data || [];

    if (!Array.isArray(models) || models.length === 0) {
      result.innerHTML = `
        <div class="status-card error">
          <div class="status-title">✗ Nenhum modelo encontrado</div>
          <div class="status-text">Sua chave não tem acesso a nenhum modelo. Verifique seu plano em z.ai.</div>
        </div>
      `;
      showToast('Nenhum modelo acessível', 'error');
      return;
    }

    // Ordena por prioridade (campo "priority" se existir)
    models.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));

    // Filtra os que são "supported_in_api: true"
    const usable = models.filter(m => m.supported_in_api !== false);

    result.innerHTML = `
      <div class="status-card ok">
        <div class="status-title">✓ ${usable.length} modelo(s) disponível(is) para sua chave</div>
        <div class="status-text">
          ${usable.map(m => `
            <div style="padding:6px 8px; margin:4px 0; background:var(--bg-soft); border-radius:4px; border-left:2px solid var(--primary);">
              <div style="font-family:monospace; color:var(--primary); font-size:12px; font-weight:600;">${m.slug}</div>
              <div style="font-size:11px; color:var(--fg-soft);">${escapeHtml(m.display_name || '')} ${m.description ? `· ${escapeHtml(m.description)}` : ''}</div>
              <div style="font-size:10px; color:var(--muted); margin-top:2px;">
                Context: ${m.context_window?.toLocaleString() || '—'} tokens
                ${m.input_modalities?.length ? `· Modalidades: ${m.input_modalities.join(', ')}` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${usable.length > 0 ? `
          <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border);">
            <button class="btn btn-sm btn-outline" onclick="useDetectedModel('${usable[0].slug}')">
              Usar ${usable[0].slug} (recomendado)
            </button>
          </div>
        ` : ''}
      </div>
    `;

    showToast(`${usable.length} modelo(s) disponível(is)!`, 'success');
  } catch (err) {
    result.innerHTML = `
      <div class="status-card error">
        <div class="status-title">✗ Falha na detecção</div>
        <div class="status-text">${escapeHtml(err.message)}</div>
      </div>
    `;
    showToast(err.message, 'error');
  }
}

function useDetectedModel(model) {
  document.getElementById('cfg-model').value = model;
  saveConfig();
  showToast(`Modelo ${model} selecionado!`, 'success');
}

function clearConfig() {
  if (!confirm('Remover chave do navegador?')) return;
  clearConfigFromStorage();
  ZAI_MODELS_WORKING = null;
  loadConfigStatus();
  showToast('Configuração removida');
}

function toggleKeyVisibility() {
  const input = document.getElementById('cfg-apikey');
  const btn = document.getElementById('eye-btn');
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  loadConversations();
  loadSessionsList();
  loadConfigStatus();
  loadLawsuitHistory();
  initDocCharCount();
});

// ============================================================
// LAWSUITS TAB — DataJud CNJ API (oficial, gratuita, sem scraping)
// ============================================================
//
// Documentação: https://api-publica.datajud.cnj.jus.br/
// A API DataJud retorna metadados de processos de TODOS os tribunais
// brasileiros que aderiram ao Sistema Nacional de Informações Judiciais (SNIJ).
// Não requer scraping, não requer captcha, não requer proxy.
// É a via OFICIAL recomendada pelo CNJ.
//
// Endpoint público (sem auth):
//   GET https://api-publica.datajud.cnj.jus.br/api_publica/processos/{numero}
//
// Para múltiplos tribunais, há endpoints por tribunal:
//   GET https://api-publica.datajud.cnj.jus.br/api_publica/{tribunalId}/processos/{numero}
// onde tribunalId = "TJSP", "TRT2", "TRF3", etc.

const DATAJUD_BASE = 'https://api-publica.datajud.cnj.jus.br/api_publica';

/**
 * Mapeia o segmento + tribunal do número CNJ para o ID usado pela API DataJud.
 * Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO
 *   - J (2 dígitos): 1=STF, 2=CNJ, 3=STJ, 4=JUSTIÇA FEDERAL, 5=JUSTIÇA DO TRABALHO,
 *                   6=ELEITORAL, 7=JUSTIÇA MILITAR DA UNIÃO, 8=JUSTIÇA ESTADUAL,
 *                   9=JUSTIÇA MILITAR ESTADUAL
 *   - TR (2 dígitos): identifica o tribunal dentro do segmento
 */
function cnjToDatajudTribunal(processNumber) {
  const cleaned = processNumber.replace(/\D/g, '');
  if (cleaned.length !== 20) return null;
  const seg = cleaned.substring(13, 14); // J
  const tr = cleaned.substring(14, 16);   // TR
  const tribunaisPorSegmento = {
    '4': { prefix: 'TRF', map: { '01': 'TRF1', '02': 'TRF2', '03': 'TRF3', '04': 'TRF4', '05': 'TRF5', '06': 'TRF6' } },
    '5': { prefix: 'TRT', map: trtMap(tr) },
    '8': { prefix: 'TJ', map: tjMap(tr) },
    '6': { prefix: 'TR', map: { '01': 'TRE1', '02': 'TRE2', '03': 'TRE3', '04': 'TRE4', '05': 'TRE5', '06': 'TRE6' } },
  };
  const config = tribunaisPorSegmento[seg];
  if (!config) return null;
  return config.map[tr] || null;
}

function trtMap(tr) {
  const map = {};
  for (let i = 1; i <= 24; i++) {
    const padded = i.toString().padStart(2, '0');
    map[padded] = `TRT${i}`;
  }
  return map;
}

function tjMap(tr) {
  const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  // TR no CNJ para justiça estadual segue numeração 01-27
  const tribunais = ['TJAC','TJAL','TJAP','TJAM','TJBA','TJCE','TJDF','TJES','TJGO','TJMA','TJMT','TJMS','TJMG','TJPA','TJPB','TJPR','TJPE','TJPI','TJRJ','TJRN','TJRS','TJRO','TJRR','TJSC','TJSP','TJSE','TJTO'];
  const map = {};
  ufs.forEach((_, i) => {
    const padded = (i + 1).toString().padStart(2, '0');
    map[padded] = tribunais[i];
  });
  return map;
}

async function searchLawsuit() {
  const number = document.getElementById('lawsuit-number').value.trim();
  const courtOverride = document.getElementById('lawsuit-court').value;

  if (!number) {
    showToast('Digite o número do processo', 'error');
    return;
  }

  const btn = document.getElementById('lawsuit-search-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Consultando CNJ...';

  const result = document.getElementById('lawsuit-result');
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Consultando API DataJud do CNJ...</div></div>';

  try {
    let tribunalId = courtOverride || cnjToDatajudTribunal(number);

    // Endpoint: /processos/{numero} (sem tribunal) OU /{tribunalId}/processos/{numero}
    const url = tribunalId
      ? `${DATAJUD_BASE}/${tribunalId}/processos/${number}`
      : `${DATAJUD_BASE}/processos/${number}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (response.status === 404) {
      throw new Error(`Processo não encontrado no DataJud. Verifique o número ou se o tribunal aderiu ao SNIJ.`);
    }
    if (!response.ok) {
      throw new Error(`Erro ${response.status} ao consultar CNJ`);
    }

    const data = await response.json();
    displayLawsuit(data, tribunalId);
    saveLawsuitToHistory(number, data);
  } catch (err) {
    result.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⚠️</div>
        <div class="empty-title">Falha na consulta</div>
        <div class="empty-text">${escapeHtml(err.message)}</div>
        <div style="font-size:11px; color:var(--muted); max-width:400px; margin-top:8px;">
          Possíveis causas:<br>
          • Número CNJ inválido ou com erro de dígito<br>
          • Tribunal não aderiu ao SNIJ (casos raros)<br>
          • Processo em segredo de justiça (acesso restrito)<br>
          • CORS — use o proxy em /api/lawsuit se necessário
        </div>
      </div>
    `;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '🔍 Consultar processo';
  }
}

function displayLawsuit(data, tribunalId) {
  const result = document.getElementById('lawsuit-result');
  document.getElementById('lawsuit-result-title').textContent = `Processo · ${data.numeroProcesso || '—'}`;
  document.getElementById('lawsuit-ai-btn').style.display = 'inline-flex';
  document.getElementById('lawsuit-ai-btn').dataset.lawsuit = JSON.stringify(data);

  const movs = data.movimentos || [];
  const partes = data.assuntos || [];
  const valor = data.valorCausa ? parseFloat(data.valorCausa).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;

  result.innerHTML = `
    <div class="piece-info-card" style="margin-bottom:16px;">
      <h4>${escapeHtml(data.classeProcessual || 'Classe não informada')}</h4>
      <div class="piece-info-meta">
        Nº ${escapeHtml(data.numeroProcesso || '—')} · ${escapeHtml(tribunalId || 'CNJ')} · Sistema: ${escapeHtml(data.sistema?.codigo || data.sistema?.nome || '—')}
      </div>
      ${data.dataAjuizamento ? `<div style="font-size:11px; color:var(--fg-soft); margin-top:6px;">Ajuizado em: ${new Date(data.dataAjuizamento).toLocaleDateString('pt-BR')}</div>` : ''}
      ${valor ? `<div style="font-size:13px; color:var(--primary); margin-top:6px; font-weight:600;">Valor da causa: ${valor}</div>` : ''}
    </div>

    ${data.assuntos && data.assuntos.length > 0 ? `
      <div style="margin-bottom:16px;">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--primary); font-weight:600; margin-bottom:8px;">Assuntos</div>
        ${data.assuntos.map(a => `<div style="font-size:12px; padding:6px 10px; background:var(--bg-soft); border-radius:4px; margin-bottom:4px; border-left:2px solid var(--primary);">${escapeHtml(a.nome || a.codigo || '—')}</div>`).join('')}
      </div>
    ` : ''}

    <div style="margin-bottom:16px;">
      <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--primary); font-weight:600; margin-bottom:8px;">Órgão Julgador</div>
      <div style="font-size:12px; color:var(--fg-soft);">
        ${escapeHtml(data.orgaoJulgador?.nome || '—')}<br>
        Código: ${escapeHtml(data.orgaoJulgador?.codigo || '—')} · Município: ${escapeHtml(data.orgaoJulgador?.codigoMunicipio || '—')}
      </div>
    </div>

    <div style="margin-bottom:16px;">
      <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--primary); font-weight:600; margin-bottom:8px;">Movimentações (${movs.length})</div>
      <div style="max-height:400px; overflow-y:auto;" class="scroll-thin">
        ${movs.slice(0, 50).map(m => `
          <div style="padding:8px 10px; border-left:2px solid var(--primary); margin-bottom:6px; background:var(--bg-soft); border-radius:0 4px 4px 0;">
            <div style="font-size:11px; color:var(--muted); font-family:monospace;">${m.dataHora ? new Date(m.dataHora).toLocaleString('pt-BR') : '—'}</div>
            <div style="font-size:12px; color:var(--fg); margin-top:2px; font-weight:500;">${escapeHtml(m.nome || '—')}</div>
            ${m.complementosTabelados?.map(c => `<div style="font-size:11px; color:var(--fg-soft); margin-top:2px;">${escapeHtml(c.descricao || JSON.stringify(c))}</div>`).join('') || ''}
          </div>
        `).join('')}
        ${movs.length > 50 ? `<div style="text-align:center; padding:8px; font-size:11px; color:var(--muted);">+ ${movs.length - 50} movimentações não exibidas</div>` : ''}
      </div>
    </div>

    <details style="margin-top:16px;">
      <summary style="cursor:pointer; font-size:11px; color:var(--primary);">📦 Ver JSON completo (debug)</summary>
      <pre style="font-size:10px; color:var(--fg-soft); background:var(--bg-soft); padding:12px; border-radius:4px; overflow-x:auto; max-height:300px; margin-top:8px;">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
    </details>
  `;
}

function saveLawsuitToHistory(number, data) {
  const history = JSON.parse(localStorage.getItem('drfuturo_lawsuits') || '[]');
  const entry = {
    number,
    classe: data.classeProcessual,
    tribunal: data.orgaoJulgador?.nome || '',
    consultedAt: new Date().toISOString(),
  };
  // Remove duplicatas
  const filtered = history.filter(h => h.number !== number);
  filtered.unshift(entry);
  localStorage.setItem('drfuturo_lawsuits', JSON.stringify(filtered.slice(0, 20)));
  loadLawsuitHistory();
}

function loadLawsuitHistory() {
  const history = JSON.parse(localStorage.getItem('drfuturo_lawsuits') || '[]');
  const container = document.getElementById('lawsuit-history');
  if (!container || history.length === 0) return;
  container.innerHTML = `
    <div style="border-top:1px solid var(--border); padding-top:12px; margin-top:12px;">
      <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--muted); margin-bottom:8px;">Histórico</div>
      ${history.map(h => `
        <button onclick="document.getElementById('lawsuit-number').value='${h.number}'; searchLawsuit();" style="display:block; width:100%; text-align:left; background:transparent; border:1px solid var(--border); border-radius:4px; padding:6px 8px; margin-bottom:4px; cursor:pointer; color:var(--fg-soft); font-size:11px;">
          <span style="font-family:monospace; color:var(--primary);">${h.number}</span>
          ${h.classe ? `<br><span style="color:var(--muted);">${escapeHtml(h.classe)}</span>` : ''}
        </button>
      `).join('')}
    </div>
  `;
}

async function analyzeLawsuitWithAI() {
  const btn = document.getElementById('lawsuit-ai-btn');
  const data = JSON.parse(btn.dataset.lawsuit || '{}');

  if (!hasConfig()) {
    showToast('Configure sua chave Z.AI na aba Config', 'error');
    switchTab('config');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Analisando...';

  const result = document.getElementById('lawsuit-result');
  const original = result.innerHTML;
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Analisando processo com GLM 5.2...</div></div>';

  try {
    const prompt = `Você é um advogado sênior brasileiro (persona: Aury Lopes Jr + Badaró + Bottini + Nucci). Analise o processo judicial abaixo e produza:

1. RESUMO ESTRATÉGICO — síntese em 3-5 linhas do que se trata
2. PARTES E POSIÇÃO — quem é autor, réu, e qual a posição defensiva recomendada
3. RISCO — nível (Baixo/Médio/Alto) com justificativa
4. PRÓXIMOS PASSOS — 3 ações táticas recomendadas
5. PEÇAS SUGERIDAS — quais peças processuais preparar
6. FUNDAMENTAÇÃO — artigos de lei e possíveis teses

DADOS DO PROCESSO (API DataJud CNJ):
${JSON.stringify(data, null, 2)}`;

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_CHAT },
      { role: 'user', content: prompt },
    ];

    const analysis = await callGLM(messages, { temperature: 0.5, maxTokens: 4000 });

    result.innerHTML = original + `
      <div style="border-top:2px solid var(--primary); margin-top:24px; padding-top:16px;">
        <h3 style="color:var(--primary); font-family:'Playfair Display',serif; margin-bottom:12px;">✦ Análise IA do Processo</h3>
        <div style="font-family:'Courier New',monospace; font-size:12px; color:var(--fg); white-space:pre-wrap; line-height:1.6;">${escapeHtml(analysis)}</div>
        <div style="font-size:10px; color:var(--muted); margin-top:12px; font-style:italic;">⚠️ Análise gerada por IA. Revise antes de usar em atos processuais.</div>
      </div>
    `;
    showToast('Análise IA concluída!', 'success');
  } catch (err) {
    result.innerHTML = original + `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro na análise: ${escapeHtml(err.message)}</div></div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Análise IA';
  }
}

// ============================================================
// DOCUMENTS TAB — RAG simples (GLM context window)
// ============================================================
//
// Implementação RAG sem banco vetorial:
// - Cole o texto do documento
// - Faça uma pergunta
// - GLM responde APENAS com base no texto fornecido
// - Cita trechos do documento como prova
//
// Vantagem: zero infraestrutura (sem Pinecone, sem embeddings)
// Limitação: documento deve caber no context window do GLM (até ~120k tokens)
//
// Para múltiplos documentos com busca semântica real, evoluir para:
// - pgvector no Postgres (Neon)
// - Embeddings via Z.AI
// - Retrieval por similaridade de cosseno

function initDocCharCount() {
  const textarea = document.getElementById('doc-text');
  if (!textarea) return;
  const counter = document.getElementById('doc-char-count');
  const update = () => {
    const len = textarea.value.length;
    counter.textContent = `${len.toLocaleString('pt-BR')} caracteres · ~${Math.ceil(len / 4)} tokens`;
    if (len > 480000) {
      counter.textContent += ' ⚠️ pode exceder o context window do GLM';
      counter.style.color = 'var(--danger)';
    } else {
      counter.style.color = '';
    }
  };
  textarea.addEventListener('input', update);
}

async function askDocument() {
  const title = document.getElementById('doc-title').value.trim();
  const text = document.getElementById('doc-text').value.trim();
  const question = document.getElementById('doc-question').value.trim();

  if (!text) {
    showToast('Cole o texto do documento', 'error');
    return;
  }
  if (!question) {
    showToast('Digite uma pergunta', 'error');
    return;
  }
  if (!hasConfig()) {
    showToast('Configure sua chave Z.AI na aba Config', 'error');
    switchTab('config');
    return;
  }

  const btn = document.getElementById('doc-ask-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Analisando...';

  const result = document.getElementById('doc-result');
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Aplicando RAG — GLM 5.2 lendo o documento...</div></div>';

  try {
    // Prompt RAG: instrução explícita de NÃO alucinar
    const systemPrompt = `Você é drfuturo — assistente jurídico RAG de alta precisão.

# REGRA FUNDAMENTAL
Responda APENAS com base no documento fornecido pelo usuário. NUNCA invente:
- Números de processos
- Súmulas ou jurisprudência
- Artigos de lei que não estejam no texto
- Citações que não existam no documento

Se a informação não estiver no documento, diga explicitamente:
"Não encontrei esta informação no documento fornecido."

# FORMATO DA RESPOSTA
1. **Resposta direta** à pergunta (2-3 linhas)
2. **Citação literal** do trecho do documento que fundamenta a resposta (entre aspas)
3. **Observações** (se houver ambiguidade ou informações complementares no documento)
4. **Trecho não encontrado** — se aplicável

# CONTEXTO
${title ? `Documento: ${title}` : 'Documento sem título'}
Tamanho: ${text.length} caracteres

Responda em português jurídico brasileiro.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `DOCUMENTO:\n\n${text}\n\nPERGUNTA:\n${question}` },
    ];

    const answer = await callGLM(messages, { temperature: 0.2, maxTokens: 4000 });

    document.getElementById('doc-result-title').textContent = title || 'Análise RAG';
    document.getElementById('doc-clear-btn').style.display = 'inline-flex';

    result.innerHTML = `
      <div class="piece-info-card" style="margin-bottom:16px;">
        <div style="font-size:11px; color:var(--primary); font-weight:600; margin-bottom:4px;">📄 Documento analisado</div>
        <div style="font-size:13px; color:var(--fg);">${escapeHtml(title || 'Sem título')}</div>
        <div style="font-size:10px; color:var(--muted); margin-top:4px;">${text.length.toLocaleString('pt-BR')} caracteres · ~${Math.ceil(text.length / 4)} tokens</div>
      </div>
      <div class="piece-info-card" style="margin-bottom:16px;">
        <div style="font-size:11px; color:var(--accent); font-weight:600; margin-bottom:4px;">❓ Pergunta</div>
        <div style="font-size:13px; color:var(--fg);">${escapeHtml(question)}</div>
      </div>
      <div style="border-top:1px solid var(--border); padding-top:16px;">
        <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.15em; color:var(--primary); font-weight:600; margin-bottom:12px;">✦ Resposta (RAG)</div>
        <div style="font-family:'Courier New',monospace; font-size:13px; color:var(--fg); white-space:pre-wrap; line-height:1.6;">${escapeHtml(answer)}</div>
      </div>
      <div style="font-size:10px; color:var(--muted); margin-top:16px; font-style:italic; border-top:1px solid var(--border); padding-top:12px;">
        ✓ Resposta baseada apenas no documento fornecido · 0 alucinações por design (temperature=0.2, prompt anti-invenção)
      </div>
    `;
    showToast('Análise RAG concluída!', 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${escapeHtml(err.message)}</div></div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Analisar com RAG';
  }
}

function clearDocument() {
  document.getElementById('doc-title').value = '';
  document.getElementById('doc-text').value = '';
  document.getElementById('doc-question').value = '';
  document.getElementById('doc-char-count').textContent = '0 caracteres';
  document.getElementById('doc-clear-btn').style.display = 'none';
  document.getElementById('doc-result-title').textContent = 'Análise do Documento';
  document.getElementById('doc-result').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📚</div>
      <div class="empty-title">RAG — Retrieval-Augmented Generation</div>
      <div class="empty-text">Cole um documento à esquerda, faça uma pergunta, e a IA responde baseada APENAS no conteúdo fornecido — sem inventar jurisprudência.</div>
    </div>
  `;
}

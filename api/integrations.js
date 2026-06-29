/**
 * Proxy serverless para integrações oficiais
 * /api/integrations
 *
 * Suporta:
 * - DataJud por tema (busca jurisprudência por assunto)
 * - Planalto (busca leis federais)
 * - DJ-e CNJ (publicações no diário oficial)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tipo, query, tribunal, numeroProcesso, nomeParte, dataInicio, dataFim } = req.body || {};

  try {
    if (tipo === 'datajud-tema') {
      return await searchDataJudTema(req, res, query, tribunal);
    }
    if (tipo === 'planalto') {
      return await searchPlanalto(req, res, query);
    }
    if (tipo === 'dje') {
      return await searchDJe(req, res, numeroProcesso, nomeParte, dataInicio, dataFim);
    }
    return res.status(400).json({ error: 'Tipo inválido. Use: datajud-tema, planalto, dje' });
  } catch (err) {
    console.error('Integration error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ============================================================
// 1. DataJud por tema — busca processos por assunto
// ============================================================
async function searchDataJudTema(req, res, query, tribunal) {
  if (!query) return res.status(400).json({ error: 'query é obrigatório' });

  // DataJud suporta busca por texto livre via POST
  // Tenta vários tribunais principais
  const tribunais = tribunal
    ? [tribunal]
    : ['TJSP', 'TJRJ', 'TJMG', 'TJRS', 'TRF3', 'TRF4'];

  const allResults = [];

  for (const t of tribunais) {
    try {
      const url = `https://api-publica.datajud.cnj.jus.br/api_publica/${t}/processos`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query: {
            bool: {
              should: [
                { match: { 'assuntos.nomeAssunto': query } },
                { match: { 'classeProcessual': query } },
                { match: { '_all': query } },
              ],
            },
          },
          size: 5,
          sort: [{ dataAjuizamento: { order: 'desc' } }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const hits = data.hits?.hits || [];
        for (const hit of hits) {
          const src = hit._source || {};
          allResults.push({
            tribunal: t,
            numeroProcesso: src.numeroProcesso,
            classeProcessual: src.classeProcessual,
            assuntos: (src.assuntos || []).map(a => a.nomeAssunto).filter(Boolean),
            dataAjuizamento: src.dataAjuizamento,
            orgaoJulgador: src.orgaoJulgador?.nome,
            valorCausa: src.valorCausa,
            sistema: src.sistema?.nome,
          });
        }
      }
    } catch (err) {
      console.warn(`DataJud tema ${t} falhou:`, err.message);
    }

    // Limite de 20 resultados total
    if (allResults.length >= 20) break;
  }

  return res.status(200).json({
    results: allResults.slice(0, 20),
    total: allResults.length,
    query,
    tribunaisPesquisados: tribunais,
  });
}

// ============================================================
// 2. Planalto — busca leis federais
// ============================================================
async function searchPlanalto(req, res, query) {
  if (!query) return res.status(400).json({ error: 'query é obrigatório' });

  // Planalto não tem API REST limpa, mas podemos usar:
  // 1. LexML (legislação brasileira em XML)
  // 2. Busca direta no site do Planalto

  // Tentativa 1: LexML API
  try {
    const lexmlUrl = `http://www.lexml.gov.br/busca/search?k=${encodeURIComponent(query)}&f=tipo_documento:Legisla%C3%A7%C3%A3o`;
    const response = await fetch(lexmlUrl, {
      headers: { 'Accept': 'application/json' },
    });

    if (response.ok) {
      const text = await response.text();
      // LexML retorna XML/HTML, tentamos extrair resultados
      const matches = text.match(/<item[^>]*>([\s\S]*?)<\/item>/g) || [];
      const results = matches.slice(0, 10).map(m => {
        const titulo = m.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const link = m.match(/<link>(.*?)<\/link>/)?.[1] || '';
        const desc = m.match(/<description>(.*?)<\/description>/)?.[1] || '';
        return { titulo, link, descricao: desc };
      });

      if (results.length > 0) {
        return res.status(200).json({ results, source: 'LexML', query });
      }
    }
  } catch (err) {
    console.warn('LexML falhou:', err.message);
  }

  // Tentativa 2: URL de busca do Planalto (retorna link direto)
  const planaltoUrl = `https://www4.planalto.gov.br/legislacao`;
  const resultados = [
    {
      titulo: `Buscar "${query}" no Planalto`,
      link: `https://www4.planalto.gov.br/legislacao/#/pesquisa/${encodeURIComponent(query)}`,
      descricao: 'Clique para abrir a busca oficial no Portal da Legislação (Planalto)',
      source: 'Planalto',
    },
    {
      titulo: `Lei nº ${query.replace(/\D/g, '')} (se aplicável)`,
      link: `https://www.planalto.gov.br/ccivil_03/leis/l${query.replace(/\D/g, '').padStart(4, '0')}.htm`,
      descricao: 'Acesso direto à lei pelo número (se existir)',
      source: 'Planalto direto',
    },
    {
      titulo: `Decretos com "${query}"`,
      link: `https://www4.planalto.gov.br/legislacao/#/pesquisa/${encodeURIComponent('decreto ' + query)}`,
      descricao: 'Busca por decretos relacionados',
      source: 'Planalto',
    },
  ];

  // Tentativa 3: usar web search via Z.AI se configurada
  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    try {
      const searchUrl = 'https://open.bigmodel.cn/api/paas/v4/tools';
      const searchRes = await fetch(searchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${zaiKey}`,
        },
        body: JSON.stringify({
          request_id: `planalto-${Date.now()}`,
          tool: 'web-search',
          input: { query: `site:planalto.gov.br ${query}`, num: 10 },
        }),
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const webResults = searchData.output || searchData.results || [];
        if (Array.isArray(webResults) && webResults.length > 0) {
          return res.status(200).json({
            results: [
              ...resultados,
              ...webResults.map(r => ({
                titulo: r.title || r.name || '',
                link: r.url || r.link || '',
                descricao: r.snippet || r.content || '',
                source: 'Web Search (Planalto)',
              })),
            ],
            query,
            source: 'Planalto + Web Search',
          });
        }
      }
    } catch (err) {
      console.warn('Web search Planalto falhou:', err.message);
    }
  }

  return res.status(200).json({ results: resultados, query, source: 'Planalto direto' });
}

// ============================================================
// 3. DJ-e CNJ — publicações no diário oficial
// ============================================================
async function searchDJe(req, res, numeroProcesso, nomeParte, dataInicio, dataFim) {
  if (!numeroProcesso && !nomeParte) {
    return res.status(400).json({ error: 'numeroProcesso ou nomeParte é obrigatório' });
  }

  // API oficial do DJ-e (Comunicados Judiciais)
  // Documentação: https://comunicadosapi.cnj.jus.br/
  const baseUrl = 'https://comunicadosapi.cnj.jus.br/v1/comunicacoes';

  // Constrói query
  const params = new URLSearchParams();
  if (numeroProcesso) params.append('numeroProcesso', numeroProcesso.replace(/\D/g, ''));
  if (nomeParte) params.append('nomeParte', nomeParte);
  if (dataInicio) params.append('dataDisponibilizacaoInicio', dataInicio);
  if (dataFim) params.append('dataDisponibilizacaoFim', dataFim);

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'drfuturo/3.0',
      },
    });

    if (!response.ok) {
      throw new Error(`DJ-e API retornou ${response.status}`);
    }

    const data = await response.json();
    const comunicados = data.conteudo || data.content || data || [];

    const results = (Array.isArray(comunicados) ? comunicados : []).map(c => ({
      numeroProcesso: c.numeroProcesso,
      nome: c.nome,
      tipoComunicacao: c.tipoComunicacao,
      dataDisponibilizacao: c.dataDisponibilizacao,
      dataPublicacao: c.dataPublicacao,
      tribunal: c.tribunal,
      orgaoJulgador: c.orgaoJulgador,
      meio: c.meio,
      situacao: c.situacao,
      texto: c.texto || c.intimacaoTexto,
      link: c.link || c.url,
    }));

    return res.status(200).json({
      results,
      total: data.totalElements || results.length,
      query: { numeroProcesso, nomeParte, dataInicio, dataFim },
    });
  } catch (err) {
    // Fallback: web search
    const zaiKey = process.env.ZAI_API_KEY;
    if (zaiKey) {
      try {
        const searchQuery = `diário oficial justiça ${numeroProcesso || nomeParte} site:dje.tjsp.jus.br OR site:cnj.jus.br`;
        const searchRes = await fetch('https://open.bigmodel.cn/api/paas/v4/tools', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${zaiKey}`,
          },
          body: JSON.stringify({
            request_id: `dje-${Date.now()}`,
            tool: 'web-search',
            input: { query: searchQuery, num: 10 },
          }),
        });

        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const webResults = searchData.output || searchData.results || [];
          return res.status(200).json({
            results: webResults.map(r => ({
              titulo: r.title || r.name || '',
              link: r.url || r.link || '',
              texto: r.snippet || r.content || '',
              source: 'Web Search (DJ-e fallback)',
            })),
            total: webResults.length,
            query: { numeroProcesso, nomeParte },
            fallback: true,
          });
        }
      } catch {}
    }

    return res.status(502).json({
      error: 'DJ-e API indisponível: ' + err.message,
      hint: 'Tente novamente mais tarde ou use a aba Busca para pesquisar.',
    });
  }
}

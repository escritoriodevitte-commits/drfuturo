/* ============================================================
   drfuturo — Integrações Oficiais
   DataJud por tema · Planalto · DJ-e CNJ
   ============================================================ */

// ============================================================
// 1. DataJud por tema — busca jurisprudência por assunto
// ============================================================

async function searchDataJudTema() {
  const query = document.getElementById('datajud-tema-input').value.trim();
  const tribunal = document.getElementById('datajud-tema-tribunal').value;

  if (!query) {
    showToast('Digite um tema para buscar', 'error');
    return;
  }

  const result = document.getElementById('datajud-tema-result');
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Buscando em múltiplos tribunais...</div></div>';

  try {
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'datajud-tema',
        query,
        tribunal: tribunal || null,
      }),
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);
    if (!data.results || data.results.length === 0) {
      result.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">Nenhum processo encontrado</div>
          <div class="empty-text">Tente outro termo ou tribunal. Termos muito específicos podem não retornar resultados.</div>
        </div>
      `;
      return;
    }

    result.innerHTML = `
      <div class="piece-info-card">
        <h4>${data.total} processo(s) encontrado(s)</h4>
        <div class="piece-info-meta">
          Tema: "${escapeHtml(query)}" ·
          Tribunais: ${(data.tribunaisPesquisados || []).join(', ')}
        </div>
      </div>
      <div style="margin-top:12px;">
        ${data.results.map(r => `
          <div class="result-card" style="border-left:3px solid var(--primary); cursor:pointer;" onclick="document.getElementById('lawsuit-number').value='${r.numeroProcesso}'; switchTab('lawsuits'); setTimeout(() => searchLawsuit(), 100);">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div style="flex:1;">
                <span class="tag">${r.tribunal}</span>
                <span style="font-family:monospace; color:var(--primary); margin-left:8px; font-size:12px;">${escapeHtml(r.numeroProcesso || '—')}</span>
              </div>
              <button onclick="event.stopPropagation(); toggleFavorito('DataJud','${escapeHtml(r.tribunal + ' ' + r.numeroProcesso)}','','${escapeHtml(r.numeroProcesso)}')" class="btn-icon" title="Favoritar">⭐</button>
            </div>
            <div style="font-size:12px; margin-top:6px;">
              <strong>${escapeHtml(r.classeProcessual || 'Classe não informada')}</strong>
            </div>
            ${r.assuntos && r.assuntos.length > 0 ? `
              <div style="font-size:11px; color:var(--fg-soft); margin-top:4px;">
                📋 ${r.assuntos.map(a => escapeHtml(a)).join(' · ')}
              </div>
            ` : ''}
            <div style="font-size:10px; color:var(--muted); margin-top:4px;">
              ${r.orgaoJulgador ? '🏛️ ' + escapeHtml(r.orgaoJulgador) : ''}
              ${r.dataAjuizamento ? ' · 📅 ' + new Date(r.dataAjuizamento).toLocaleDateString('pt-BR') : ''}
              ${r.sistema ? ' · 💻 ' + escapeHtml(r.sistema) : ''}
            </div>
            <div style="font-size:10px; color:var(--primary); margin-top:6px;">→ Clique para ver detalhes completos</div>
          </div>
        `).join('')}
      </div>
    `;
    showToast(`${data.total} processo(s) encontrado(s)!`, 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${escapeHtml(err.message)}</div></div>`;
    showToast(err.message, 'error');
  }
}

// ============================================================
// 2. Planalto — busca leis federais
// ============================================================

async function searchPlanalto() {
  const query = document.getElementById('planalto-input').value.trim();

  if (!query) {
    showToast('Digite um termo para buscar', 'error');
    return;
  }

  const result = document.getElementById('planalto-result');
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Buscando no Planalto...</div></div>';

  try {
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'planalto',
        query,
      }),
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);
    if (!data.results || data.results.length === 0) {
      result.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">Nenhuma lei encontrada</div></div>';
      return;
    }

    result.innerHTML = `
      <div class="piece-info-card">
        <h4>${data.results.length} resultado(s) — ${escapeHtml(data.source || 'Planalto')}</h4>
        <div class="piece-info-meta">Busca: "${escapeHtml(query)}"</div>
      </div>
      <div style="margin-top:12px;">
        ${data.results.map((r, i) => `
          <div class="result-card">
            <a href="${r.link}" target="_blank" rel="noopener" style="color:var(--fg); text-decoration:none;">
              <h4>${escapeHtml(r.titulo || r.titulo || 'Sem título')}</h4>
              <div class="result-url">${escapeHtml(r.link || '')}</div>
              ${r.descricao ? `<div class="result-snippet">${escapeHtml(r.descricao)}</div>` : ''}
              ${r.source ? `<div style="font-size:10px; color:var(--muted); margin-top:4px;">Fonte: ${escapeHtml(r.source)}</div>` : ''}
            </a>
          </div>
        `).join('')}
      </div>
    `;
    showToast(`${data.results.length} resultado(s)!`, 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${escapeHtml(err.message)}</div></div>`;
    showToast(err.message, 'error');
  }
}

// ============================================================
// 3. DJ-e CNJ — publicações no diário oficial
// ============================================================

async function searchDJe() {
  const numeroProcesso = document.getElementById('dje-processo').value.trim();
  const nomeParte = document.getElementById('dje-parte').value.trim();
  const dataInicio = document.getElementById('dje-inicio').value;
  const dataFim = document.getElementById('dje-fim').value;

  if (!numeroProcesso && !nomeParte) {
    showToast('Digite número do processo ou nome da parte', 'error');
    return;
  }

  const result = document.getElementById('dje-result');
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Consultando DJ-e (Diário da Justiça Eletrônico)...</div></div>';

  try {
    const res = await fetch('/api/integrations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'dje',
        numeroProcesso,
        nomeParte,
        dataInicio: dataInicio ? new Date(dataInicio).toISOString().split('T')[0] : null,
        dataFim: dataFim ? new Date(dataFim).toISOString().split('T')[0] : null,
      }),
    });

    const data = await res.json();

    if (data.error) throw new Error(data.error);
    if (!data.results || data.results.length === 0) {
      result.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📰</div>
          <div class="empty-title">Nenhuma publicação encontrada</div>
          <div class="empty-text">Verifique o número do processo ou nome. Algumas publicações podem não estar indexadas no DJ-e.</div>
        </div>
      `;
      return;
    }

    result.innerHTML = `
      <div class="piece-info-card">
        <h4>${data.total} publicação(ões) encontrada(s)</h4>
        <div class="piece-info-meta">
          ${data.fallback ? '⚠️ Via web search (API DJ-e indisponível)' : '✓ Via API oficial DJ-e CNJ'}
        </div>
      </div>
      <div style="margin-top:12px;">
        ${data.results.map(r => `
          <div class="result-card" style="${r.tipoComunicacao ? 'border-left:3px solid var(--accent);' : ''}">
            ${r.link ? `
              <a href="${r.link}" target="_blank" rel="noopener" style="color:var(--fg); text-decoration:none;">
                <h4>${escapeHtml(r.titulo || r.nome || r.numeroProcesso || 'Publicação')}</h4>
              </a>
            ` : `
              <h4>${escapeHtml(r.titulo || r.nome || r.numeroProcesso || 'Publicação')}</h4>
            `}
            ${r.numeroProcesso ? `<div class="result-url">Processo: ${escapeHtml(r.numeroProcesso)}</div>` : ''}
            ${r.texto ? `<div class="result-snippet">${escapeHtml(r.texto.slice(0, 300))}${r.texto.length > 300 ? '...' : ''}</div>` : ''}
            ${r.descricao ? `<div class="result-snippet">${escapeHtml(r.descricao)}</div>` : ''}
            <div style="font-size:10px; color:var(--muted); margin-top:4px;">
              ${r.tipoComunicacao ? '📬 ' + escapeHtml(r.tipoComunicacao) : ''}
              ${r.dataDisponibilizacao ? ' · 📅 ' + new Date(r.dataDisponibilizacao).toLocaleDateString('pt-BR') : ''}
              ${r.tribunal ? ' · 🏛️ ' + escapeHtml(r.tribunal) : ''}
              ${r.orgaoJulgador ? ' · ⚖️ ' + escapeHtml(r.orgaoJulgador) : ''}
              ${r.situacao ? ' · ' + escapeHtml(r.situacao) : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    showToast(`${data.total} publicação(ões) encontrada(s)!`, 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${escapeHtml(err.message)}</div></div>`;
    showToast(err.message, 'error');
  }
}

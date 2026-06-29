/* ============================================================
   drfuturo — Features avançadas (Fases 1-8)
   Carregado após app.js
   ============================================================ */

// ============================================================
// FASE 1: Exportar para DOCX e PDF (genérico)
// ============================================================

/**
 * Função genérica para exportar qualquer texto para PDF
 * @param {string} content - texto (markdown simples)
 * @param {string} filename - nome do arquivo sem extensão
 * @param {string} title - título opcional no topo
 */
async function exportToPDF(content, filename, title) {
  if (!content) {
    showToast('Nada para exportar', 'error');
    return;
  }

  // Cria div temporária com conteúdo formatado
  const div = document.createElement('div');
  div.style.cssText = 'padding: 50px; font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: #000; background: #fff; width: 800px; max-width: 800px;';

  let html = '';
  if (title) {
    html += `<h1 style="font-family: Arial, sans-serif; font-size: 18pt; text-align: center; margin-bottom: 30px; color: #0B2545;">${escapeHtml(title)}</h1>`;
    html += '<hr style="border: 1px solid #0B2545; margin-bottom: 20px;">';
  }

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      html += `<h1 style="font-family: Arial, sans-serif; font-size: 16pt; color: #0B2545; margin-top: 20px;">${escapeHtml(line.slice(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2 style="font-family: Arial, sans-serif; font-size: 14pt; color: #0B2545; margin-top: 16px;">${escapeHtml(line.slice(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3 style="font-family: Arial, sans-serif; font-size: 13pt; color: #333; margin-top: 12px;">${escapeHtml(line.slice(4))}</h3>`;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<p style="margin-left: 20px; text-align: justify;">• ${escapeHtml(line.slice(2))}</p>`;
    } else if (line.startsWith('  - ') || line.startsWith('  * ')) {
      html += `<p style="margin-left: 40px; text-align: justify;">◦ ${escapeHtml(line.slice(4))}</p>`;
    } else if (line.trim() === '') {
      html += '<br>';
    } else if (line.includes('**')) {
      // Bold markdown
      const parts = line.split('**');
      let formatted = '';
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          formatted += escapeHtml(parts[i]);
        } else {
          formatted += `<strong>${escapeHtml(parts[i])}</strong>`;
        }
      }
      html += `<p style="text-align: justify;">${formatted}</p>`;
    } else {
      html += `<p style="text-align: justify;">${escapeHtml(line)}</p>`;
    }
  }

  // Rodapé
  html += `<div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; font-size: 9pt; color: #666;">
    Gerado por drfuturo em ${new Date().toLocaleString('pt-BR')}
  </div>`;

  div.innerHTML = html;
  document.body.appendChild(div);

  try {
    showToast('Gerando PDF...', 'success');
    await html2pdf().set({
      margin: [25, 25, 25, 25],
      filename: `drfuturo_${filename.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'avoid-all' }
    }).from(div).save();
    showToast('PDF baixado!', 'success');
  } catch (err) {
    showToast('Erro ao gerar PDF: ' + err.message, 'error');
  } finally {
    div.remove();
  }
}

/**
 * Função genérica para exportar qualquer texto para DOCX (Word)
 */
function exportToDocx(content, filename, title) {
  if (!content) {
    showToast('Nada para exportar', 'error');
    return;
  }

  let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${escapeHtml(title || filename)}</title><style>
    @page { size: A4; margin: 3cm; }
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; text-align: justify; }
    h1, h2, h3 { font-family: Arial, sans-serif; color: #0B2545; }
    h1 { font-size: 16pt; } h2 { font-size: 14pt; } h3 { font-size: 13pt; }
    .title { text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 30px; }
    .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; text-align: center; font-size: 9pt; color: #666; }
  </style></head><body>`;

  if (title) {
    html += `<div class="title">${escapeHtml(title)}</div><hr>`;
  }

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('# ')) {
      html += `<h1>${escapeHtml(line.slice(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${escapeHtml(line.slice(3))}</h2>`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${escapeHtml(line.slice(4))}</h3>`;
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      html += `<p style="margin-left:20px;">• ${escapeHtml(line.slice(2))}</p>`;
    } else if (line.trim() === '') {
      html += '<br>';
    } else if (line.includes('**')) {
      const parts = line.split('**');
      let formatted = '';
      for (let i = 0; i < parts.length; i++) {
        formatted += i % 2 === 0 ? escapeHtml(parts[i]) : `<strong>${escapeHtml(parts[i])}</strong>`;
      }
      html += `<p>${formatted}</p>`;
    } else {
      html += `<p>${escapeHtml(line)}</p>`;
    }
  }

  html += `<div class="footer">Gerado por drfuturo em ${new Date().toLocaleString('pt-BR')}</div>`;
  html += '</body></html>';

  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `drfuturo_${filename.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Word baixado!', 'success');
}

// === Funções específicas por aba ===

function exportPieceToDocx() {
  const content = document.getElementById('copy-btn')?.dataset?.content;
  const title = document.getElementById('result-title')?.textContent || 'Peça';
  exportToDocx(content, title, title);
}

function exportPieceToPDF() {
  const content = document.getElementById('copy-btn')?.dataset?.content;
  const title = document.getElementById('result-title')?.textContent || 'Peça';
  exportToPDF(content, title, title);
}

function exportStrategyToDocx() {
  const content = document.getElementById('copy-strat-btn')?.dataset?.content;
  exportToDocx(content, 'estrategia', 'Estratégia Defensiva');
}

function exportStrategyToPDF() {
  const content = document.getElementById('copy-strat-btn')?.dataset?.content;
  exportToPDF(content, 'estrategia', 'Estratégia Defensiva');
}

function exportArgumentToPDF() {
  const content = document.getElementById('argument-content')?.dataset?.argument;
  const title = document.getElementById('live-title')?.textContent || 'Sustentação Oral';
  exportToPDF(content, 'sustentacao_oral', title);
}

function exportArgumentToDocx() {
  const content = document.getElementById('argument-content')?.dataset?.argument;
  const title = document.getElementById('live-title')?.textContent || 'Sustentação Oral';
  exportToDocx(content, 'sustentacao_oral', title);
}

function exportChatToPDF() {
  const conv = STATE.activeConversation;
  if (!conv || conv.messages.length === 0) {
    showToast('Selecione uma conversa primeiro', 'error');
    return;
  }
  let content = `# Conversa: ${conv.title}\n\n`;
  for (const msg of conv.messages) {
    const role = msg.role === 'user' ? 'VOCÊ' : 'drfuturo (IA)';
    content += `## ${role}\n${msg.content}\n\n---\n\n`;
  }
  exportToPDF(content, 'conversa', conv.title);
}

function exportChatToDocx() {
  const conv = STATE.activeConversation;
  if (!conv || conv.messages.length === 0) {
    showToast('Selecione uma conversa primeiro', 'error');
    return;
  }
  let content = `# Conversa: ${conv.title}\n\n`;
  for (const msg of conv.messages) {
    const role = msg.role === 'user' ? 'VOCÊ' : 'drfuturo (IA)';
    content += `## ${role}\n${msg.content}\n\n---\n\n`;
  }
  exportToDocx(content, 'conversa', conv.title);
}

function exportLawsuitAnalysisToPDF() {
  const btn = document.getElementById('lawsuit-ai-btn');
  if (!btn || !btn.dataset.lawsuit) {
    showToast('Gere a análise IA primeiro', 'error');
    return;
  }
  const data = JSON.parse(btn.dataset.lawsuit);
  const analysisDiv = document.querySelector('#lawsuit-result h3');
  if (!analysisDiv) {
    showToast('Gere a análise IA primeiro', 'error');
    return;
  }
  // Pega todo o texto após "Análise IA do Processo"
  const resultDiv = document.getElementById('lawsuit-result');
  const allText = resultDiv.innerText;
  const idx = allText.indexOf('Análise IA do Processo');
  const content = idx >= 0 ? allText.slice(idx) : allText;
  exportToPDF(content, `processo_${data.numeroProcesso || 'analise'}`, `Análise IA — ${data.numeroProcesso || 'Processo'}`);
}

// ============================================================
// FASE 2: Anexar PDF e extrair texto
// ============================================================

async function handlePDFUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.type !== 'application/pdf') {
    showToast('Apenas arquivos PDF', 'error');
    return;
  }

  showToast('Extraindo texto do PDF...', 'success');
  const textarea = document.getElementById('doc-text');
  const titleInput = document.getElementById('doc-title');

  if (!titleInput.value) {
    titleInput.value = file.name.replace('.pdf', '');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += `\n--- Página ${i} ---\n${pageText}\n`;
    }

    textarea.value = fullText.trim();
    textarea.dispatchEvent(new Event('input'));
    showToast(`PDF processado: ${pdf.numPages} páginas`, 'success');
  } catch (err) {
    showToast('Erro ao ler PDF: ' + err.message, 'error');
  }
}

// ============================================================
// FASE 3: Calculadora de Prazos Processuais
// ============================================================

const FERIADOS_NACIONAIS_2026 = [
  '2026-01-01', '2026-04-03', '2026-04-21', '2026-05-01',
  '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15',
  '2026-12-25',
];

const RECESSO_FORENSE = [
  ['2026-12-20', '2026-01-20'], // recesso (20/12 a 20/01)
  ['2026-07-01', '2026-07-31'], // férias forenses (julho)
];

const PRAZOS_PROCESSUAIS = [
  { id: 'rese', name: 'RESE (Recurso em Sentido Estrito)', dias: 5, tipo: 'uteis', base: 'Art. 586 CPP' },
  { id: 'apelacao', name: 'Apelação Criminal', dias: 5, tipo: 'uteis', base: 'Art. 593, §1º CPP' },
  { id: 'apelacao_juri', name: 'Apelação Júri (TJSP)', dias: 5, tipo: 'uteis', base: 'Art. 593, III CPP' },
  { id: 'embargos_dec', name: 'Embargos de Declaração', dias: 2, tipo: 'uteis', base: 'Art. 619 CPP' },
  { id: 'embargos_inf', name: 'Embargos Infringentes', dias: 10, tipo: 'uteis', base: 'Art. 609, §único CPP' },
  { id: 'resp', name: 'Recurso Especial (STJ)', dias: 15, tipo: 'uteis', base: 'Art. 508 CPC' },
  { id: 're', name: 'Recurso Extraordinário (STF)', dias: 15, tipo: 'uteis', base: 'Art. 508 CPC' },
  { id: 'agravo', name: 'Agravo em Execução', dias: 5, tipo: 'uteis', base: 'Art. 197 LEP' },
  { id: 'carta_test', name: 'Carta Testemunhável', dias: 5, tipo: 'uteis', base: 'Art. 639 CPP' },
  { id: 'resposta_acusacao', name: 'Resposta à Acusação', dias: 10, tipo: 'uteis', base: 'Art. 396 CPP' },
  { id: 'defesa_preliminar', name: 'Defesa Preliminar (Lei 11.343)', dias: 3, tipo: 'uteis', base: 'Art. 55 Lei 11.343/06' },
  { id: 'memoriais', name: 'Memoriais', dias: 5, tipo: 'uteis', base: 'Art. 404 CPP' },
  { id: 'queixa', name: 'Queixa-Crime', dias: 180, tipo: 'corridos', base: 'Art. 100, §único CP (decadencial 6 meses)' },
  { id: 'revisao', name: 'Revisão Criminal', dias: 0, tipo: 'sem_prazo', base: 'Art. 621 CPP (a qualquer tempo)' },
];

function calcularPrazo() {
  const dataStr = document.getElementById('prazo-data').value;
  const tipoPrazo = document.getElementById('prazo-tipo').value;
  const calcularRecesso = document.getElementById('prazo-recesso').checked;

  if (!dataStr) {
    showToast('Selecione a data inicial', 'error');
    return;
  }

  const config = PRAZOS_PROCESSUAIS.find(p => p.id === tipoPrazo);
  if (!config) return;

  if (config.tipo === 'sem_prazo') {
    document.getElementById('prazo-resultado').innerHTML = `
      <div class="status-card ok">
        <div class="status-title">✓ Sem prazo</div>
        <div class="status-text">
          <strong>${config.name}</strong> (${config.base})<br>
          Pode ser ajuizado a qualquer tempo.
        </div>
      </div>
    `;
    return;
  }

  const dataInicial = new Date(dataStr + 'T12:00:00');
  let dataAtual = new Date(dataInicial);
  let diasContados = 0;
  let diasUteis = 0;

  // Para prazos em dias úteis, conta a partir do próximo dia útil após a intimação
  // Para prazos corridos, conta a partir do dia seguinte
  dataAtual.setDate(dataAtual.getDate() + 1);

  while (diasUteis < config.dias) {
    const isFimDeSemana = dataAtual.getDay() === 0 || dataAtual.getDay() === 6;
    const dataISO = dataAtual.toISOString().split('T')[0];
    const isFeriado = FERIADOS_NACIONAIS_2026.includes(dataISO);
    const isRecesso = calcularRecesso && RECESSO_FORENSE.some(([ini, fim]) => dataISO >= ini && dataISO <= fim);

    if (config.tipo === 'corridos') {
      diasContados++;
      if (!isFeriado && !isRecesso) diasUteis++;
    } else {
      if (!isFimDeSemana && !isFeriado && !isRecesso) {
        diasContados++;
        diasUteis++;
      } else {
        diasContados++;
      }
    }

    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  // O prazo vence no último dia útil contado
  const dataPrazo = new Date(dataAtual);
  dataPrazo.setDate(dataPrazo.getDate() - 1);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((dataPrazo - hoje) / (1000 * 60 * 60 * 24));

  let alerta = '';
  if (diffDias < 0) {
    alerta = `<div class="status-card error"><div class="status-title">⚠️ PRAZO VENCIDO</div><div class="status-text">Venceu há ${Math.abs(diffDias)} dias</div></div>`;
  } else if (diffDias === 0) {
    alerta = `<div class="status-card error"><div class="status-title">⚠️ VENCE HOJE!</div><div class="status-text">Último dia para protocolar</div></div>`;
  } else if (diffDias <= 3) {
    alerta = `<div class="status-card warn"><div class="status-title">⚠️ URGENTE</div><div class="status-text">Faltam ${diffDias} dias</div></div>`;
  } else {
    alerta = `<div class="status-card ok"><div class="status-title">✓ No prazo</div><div class="status-text">Faltam ${diffDias} dias</div></div>`;
  }

  document.getElementById('prazo-resultado').innerHTML = `
    ${alerta}
    <div class="piece-info-card" style="margin-top:12px;">
      <h4>${config.name}</h4>
      <div class="piece-info-meta">${config.base}</div>
      <div style="font-size:13px; margin-top:8px;">
        <strong>Data inicial:</strong> ${dataInicial.toLocaleDateString('pt-BR')}<br>
        <strong>Tipo:</strong> ${config.dias} dias ${config.tipo}<br>
        <strong>Prazo final:</strong> <span style="color:var(--accent); font-weight:600; font-size:15px;">${dataPrazo.toLocaleDateString('pt-BR')}</span> (até 23h59)<br>
        <strong>Dias corridos:</strong> ${diasContados}
      </div>
    </div>
    <div style="font-size:10px; color:var(--muted); margin-top:8px; font-style:italic;">
      Cálculo considera feriados nacionais ${calcularRecesso ? '+ recesso forense' : '(sem recesso)'}.<br>
      Verifique feriados locais do seu município/estado.<br>
      Prazo contínuo (corrido) inclui fins de semana; prazo em dias úteis exclui.
    </div>
  `;
}

// ============================================================
// FASE 4: Calculadora de Pena (CP art. 59-68)
// ============================================================

function calcularPena() {
  const min = parseFloat(document.getElementById('pena-min').value) || 0;
  const max = parseFloat(document.getElementById('pena-max').value) || 0;
  const qualif = parseFloat(document.getElementById('pena-qualif').value) || 0;
  const agrav = parseFloat(document.getElementById('pena-agrav').value) || 0;
  const atenu = parseFloat(document.getElementById('pena-atenu').value) || 0;
  const aumFracao = parseFloat(document.getElementById('pena-aum').value) || 0;
  const dimFracao = parseFloat(document.getElementById('pena-dim').value) || 0;
  const multMin = parseFloat(document.getElementById('pena-mult-min').value) || 0;
  const multMax = parseFloat(document.getElementById('pena-mult-max').value) || 0;

  if (max <= min) {
    showToast('Pena máxima deve ser maior que mínima', 'error');
    return;
  }

  // 1. Pena base (art. 59) - dentro dos limites
  const penaBase = (min + max) / 2;

  // 2. Pena provisória (qualificadoras, causas especiais de aumento/diminuição)
  // Qualificadoras mudam os limites
  let novoMin = min + (qualif || 0);
  let novoMax = max + (qualif || 0);
  let penaProvisoria = (novoMin + novoMax) / 2;

  // 3. Causas de aumento/diminuição (fração)
  let penaComCausas = penaProvisoria;
  if (aumFracao > 0) penaComCausas = penaProvisoria * (1 + aumFracao);
  if (dimFracao > 0) penaComCausas = penaProvisoria * (1 - dimFracao);

  // Limita aos novos min/max
  penaComCausas = Math.max(novoMin, Math.min(novoMax, penaComCausas));

  // 4. Agravantes e atenuantes (art. 61-66)
  let penaDefinitiva = penaComCausas + agrav - atenu;
  penaDefinitiva = Math.max(novoMin, Math.min(novoMax, penaDefinitiva));

  // 5. Regime inicial (art. 33)
  let regime = '';
  let regimeObs = '';
  if (penaDefinitiva > 8) {
    regime = 'Fechado';
    regimeObs = 'Pena > 8 anos — art. 33, §2º, alínea "a" CP';
  } else if (penaDefinitiva > 4) {
    regime = 'Semiaberto';
    regimeObs = 'Pena > 4 e ≤ 8 anos — art. 33, §2º, alínea "b" CP';
  } else {
    regime = 'Aberto';
    regimeObs = 'Pena ≤ 4 anos — art. 33, §2º, alínea "c" CP';
  }

  // 6. Substituição (art. 44)
  let substituicao = '';
  if (penaDefinitiva <= 4 && !qualif) {
    substituicao = 'Possível substituição por restritiva de direitos (art. 44 CP)';
  }

  // 7. Multa (art. 49)
  const multa = (multMin + multMax) / 2;
  const diasMulta = multa;

  // 8. Sursis (art. 77)
  let sursis = '';
  if (penaDefinitiva <= 2) {
    sursis = 'Possível sursis (art. 77 CP) — suspensão da pena por 2-4 anos';
  }

  const formatPena = (anos) => {
    const a = Math.floor(anos);
    const m = Math.round((anos - a) * 12);
    return `${a} ano${a !== 1 ? 's' : ''}${m > 0 ? ` e ${m} ${m !== 1 ? 'meses' : 'mês'}` : ''}`;
  };

  document.getElementById('pena-resultado').innerHTML = `
    <div class="piece-info-card">
      <h4>Cálculo de Pena — Art. 59-68 CP</h4>
      <div style="margin-top:12px; font-size:13px; line-height:1.8;">
        <div><strong>1. Pena base (art. 59):</strong> ${formatPena(penaBase)} <span style="color:var(--muted);">(média entre ${formatPena(min)} e ${formatPena(max)})</span></div>
        ${qualif > 0 ? `<div><strong>2. Limites com qualificadora:</strong> ${formatPena(novoMin)} a ${formatPena(novoMax)}</div>` : ''}
        <div><strong>${qualif > 0 ? '3' : '2'}. Pena provisória:</strong> ${formatPena(penaProvisoria)}</div>
        ${(aumFracao > 0 || dimFracao > 0) ? `<div><strong>${qualif > 0 ? '4' : '3'}. Com causas de ${aumFracao > 0 ? `aumento (${aumFracao * 100}%)` : ''}${dimFracao > 0 ? `diminuição (${dimFracao * 100}%)` : ''}:</strong> ${formatPena(penaComCausas)}</div>` : ''}
        <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:8px;">
          <strong style="font-size:15px; color:var(--accent);">PENA DEFINITIVA: ${formatPena(penaDefinitiva)}</strong>
        </div>
        <div style="margin-top:12px; border-top:1px solid var(--border); padding-top:8px;">
          <strong>Regime inicial:</strong> <span style="color:var(--primary); font-weight:600;">${regime}</span><br>
          <span style="font-size:11px; color:var(--muted);">${regimeObs}</span>
        </div>
        ${substituicao ? `<div style="margin-top:8px; color:var(--success);">✓ ${substituicao}</div>` : ''}
        ${sursis ? `<div style="margin-top:4px; color:var(--success);">✓ ${sursis}</div>` : ''}
        ${diasMulta > 0 ? `<div style="margin-top:8px;"><strong>Multa:</strong> ${diasMulta} dias-multa (art. 49 CP)</div>` : ''}
      </div>
    </div>
    <div style="font-size:10px; color:var(--muted); margin-top:8px; font-style:italic;">
      Cálculo simplificado para fins didáticos. Para casos reais, consulte a doutrina e jurisprudência.<br>
      Súmula 231 STJ: "O juízo executório deve decidir sobre progressão mesmo sem exame criminológico."<br>
      Lei 13.964/2019 alterou regimes para crimes hediondos (art. 2º, §1º).
    </div>
  `;
}

// ============================================================
// FASE 5: Backup e Restore de dados
// ============================================================

function exportarBackup() {
  const data = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    conversations: JSON.parse(localStorage.getItem('jusai_conversations') || '[]'),
    cases: JSON.parse(localStorage.getItem('jusai_cases') || '[]'),
    hearings: JSON.parse(localStorage.getItem('jusai_sessions') || '[]'),
    lawsuits: JSON.parse(localStorage.getItem('drfuturo_lawsuits') || '[]'),
    favorites: JSON.parse(localStorage.getItem('drfuturo_favorites') || '[]'),
    agenda: JSON.parse(localStorage.getItem('drfuturo_agenda') || '[]'),
    templates: JSON.parse(localStorage.getItem('drfuturo_templates') || '[]'),
    config: {
      baseUrl: localStorage.getItem('zai_baseurl'),
      apiKey: localStorage.getItem('zai_apikey'),
      model: localStorage.getItem('zai_model'),
      provider: localStorage.getItem('drf_provider'),
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `drfuturo_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('Backup exportado!', 'success');
}

function importarBackup(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.version) throw new Error('Arquivo inválido');

      if (data.conversations) localStorage.setItem('jusai_conversations', JSON.stringify(data.conversations));
      if (data.cases) localStorage.setItem('jusai_cases', JSON.stringify(data.cases));
      if (data.hearings) localStorage.setItem('jusai_sessions', JSON.stringify(data.hearings));
      if (data.lawsuits) localStorage.setItem('drfuturo_lawsuits', JSON.stringify(data.lawsuits));
      if (data.favorites) localStorage.setItem('drfuturo_favorites', JSON.stringify(data.favorites));
      if (data.agenda) localStorage.setItem('drfuturo_agenda', JSON.stringify(data.agenda));
      if (data.templates) localStorage.setItem('drfuturo_templates', JSON.stringify(data.templates));
      if (data.config?.baseUrl) localStorage.setItem('zai_baseurl', data.config.baseUrl);
      if (data.config?.apiKey) localStorage.setItem('zai_apikey', data.config.apiKey);
      if (data.config?.model) localStorage.setItem('zai_model', data.config.model);
      if (data.config?.provider) localStorage.setItem('drf_provider', data.config.provider);

      showToast('Backup importado! Recarregando...', 'success');
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      showToast('Erro ao importar: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
}

// ============================================================
// FASE 6: Jurisprudência Favorita
// ============================================================

function toggleFavorito(source, title, url, snippet) {
  const favs = JSON.parse(localStorage.getItem('drfuturo_favorites') || '[]');
  const existing = favs.findIndex(f => f.url === url);

  if (existing >= 0) {
    favs.splice(existing, 1);
    showToast('Removido dos favoritos');
  } else {
    favs.unshift({
      id: 'fav-' + Date.now(),
      title,
      url,
      snippet,
      source,
      savedAt: new Date().toISOString(),
    });
    showToast('Adicionado aos favoritos!', 'success');
  }

  localStorage.setItem('drfuturo_favorites', JSON.stringify(favs));
  loadFavoritos();
}

function loadFavoritos() {
  const favs = JSON.parse(localStorage.getItem('drfuturo_favorites') || '[]');
  const list = document.getElementById('favoritos-list');
  if (!list) return;

  if (favs.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">⭐</div><div class="empty-text">Nenhum favorito ainda. Clique em ⭐ nos resultados de busca.</div></div>';
    return;
  }

  list.innerHTML = favs.map(f => `
    <div class="result-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <a href="${f.url}" target="_blank" style="color:var(--fg); text-decoration:none; flex:1;">
          <h4>${escapeHtml(f.title)}</h4>
          <div class="result-url">${f.url}</div>
          <div class="result-snippet">${escapeHtml(f.snippet || '')}</div>
        </a>
        <button onclick="toggleFavorito('${escapeHtml(f.source)}','${escapeHtml(f.title).replace(/'/g, "\\'")}','${f.url}','')" class="btn-icon" style="color:var(--accent);">🗑</button>
      </div>
      <div style="font-size:10px; color:var(--muted); margin-top:4px;">
        ${f.source} · ${new Date(f.savedAt).toLocaleDateString('pt-BR')}
      </div>
    </div>
  `).join('');
}

// ============================================================
// FASE 7: Calendário de Audiências
// ============================================================

function addAgendaEvent() {
  const data = document.getElementById('agenda-data').value;
  const hora = document.getElementById('agenda-hora').value;
  const tipo = document.getElementById('agenda-tipo').value;
  const titulo = document.getElementById('agenda-titulo').value;
  const local = document.getElementById('agenda-local').value;

  if (!data || !titulo) {
    showToast('Data e título são obrigatórios', 'error');
    return;
  }

  const events = JSON.parse(localStorage.getItem('drfuturo_agenda') || '[]');
  events.push({
    id: 'evt-' + Date.now(),
    data,
    hora: hora || '09:00',
    tipo,
    titulo,
    local,
    createdAt: new Date().toISOString(),
  });

  events.sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  localStorage.setItem('drfuturo_agenda', JSON.stringify(events));
  loadAgenda();
  showToast('Audiência agendada!', 'success');

  // Limpa campos
  document.getElementById('agenda-titulo').value = '';
  document.getElementById('agenda-local').value = '';
}

function deleteAgendaEvent(id) {
  let events = JSON.parse(localStorage.getItem('drfuturo_agenda') || '[]');
  events = events.filter(e => e.id !== id);
  localStorage.setItem('drfuturo_agenda', JSON.stringify(events));
  loadAgenda();
  showToast('Removido');
}

function loadAgenda() {
  const events = JSON.parse(localStorage.getItem('drfuturo_agenda') || '[]');
  const list = document.getElementById('agenda-list');
  if (!list) return;

  const hoje = new Date().toISOString().split('T')[0];
  const proximos = events.filter(e => e.data >= hoje);

  if (proximos.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">Nenhuma audiência agendada.</div></div>';
    return;
  }

  list.innerHTML = proximos.map(e => {
    const diff = Math.ceil((new Date(e.data) - new Date(hoje)) / (1000 * 60 * 60 * 24));
    let alerta = '';
    if (diff === 0) alerta = '<span style="color:var(--accent); font-weight:600;">HOJE</span>';
    else if (diff === 1) alerta = '<span style="color:var(--warning);">AMANHÃ</span>';
    else alerta = `<span style="color:var(--muted);">em ${diff} dias</span>`;

    return `
      <div class="result-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div style="flex:1;">
            <div style="display:flex; gap:8px; align-items:center; margin-bottom:4px;">
              <span style="font-size:20px;">${e.tipo === 'custodia' ? '⚖️' : e.tipo === 'instrucao' ? '📋' : e.tipo === 'juri' ? '👥' : '📅'}</span>
              <strong style="color:var(--fg);">${escapeHtml(e.titulo)}</strong>
            </div>
            <div style="font-size:12px; color:var(--fg-soft);">
              📅 ${new Date(e.data + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              ${e.hora ? ` às ${e.hora}` : ''}<br>
              ${e.local ? `📍 ${escapeHtml(e.local)}<br>` : ''}
              ${alerta}
            </div>
          </div>
          <button onclick="deleteAgendaEvent('${e.id}')" class="btn-icon" style="color:var(--accent);">🗑</button>
        </div>
      </div>
    `;
  }).join('');
}

// ============================================================
// FASE 8: Templates Personalizados
// ============================================================

function saveTemplate() {
  const nome = document.getElementById('tpl-nome').value.trim();
  const conteudo = document.getElementById('tpl-conteudo').value.trim();
  const categoria = document.getElementById('tpl-categoria').value;

  if (!nome || !conteudo) {
    showToast('Nome e conteúdo são obrigatórios', 'error');
    return;
  }

  const templates = JSON.parse(localStorage.getItem('drfuturo_templates') || '[]');
  templates.unshift({
    id: 'tpl-' + Date.now(),
    nome,
    categoria,
    conteudo,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem('drfuturo_templates', JSON.stringify(templates));

  document.getElementById('tpl-nome').value = '';
  document.getElementById('tpl-conteudo').value = '';
  loadTemplates();
  showToast('Template salvo!', 'success');
}

function deleteTemplate(id) {
  let templates = JSON.parse(localStorage.getItem('drfuturo_templates') || '[]');
  templates = templates.filter(t => t.id !== id);
  localStorage.setItem('drfuturo_templates', JSON.stringify(templates));
  loadTemplates();
  showToast('Template removido');
}

function useTemplate(id) {
  const templates = JSON.parse(localStorage.getItem('drfuturo_templates') || '[]');
  const tpl = templates.find(t => t.id === id);
  if (!tpl) return;

  // Preenche variáveis {{nome}}, {{data}}, {{processo}}
  let conteudo = tpl.conteudo;
  const vars = {
    '{{data}}': new Date().toLocaleDateString('pt-BR'),
    '{{hora}}': new Date().toLocaleTimeString('pt-BR'),
    '{{cidade}}': '[CIDADE]',
    '{{estado}}': '[ESTADO]',
  };

  Object.entries(vars).forEach(([k, v]) => {
    conteudo = conteudo.replace(new RegExp(k, 'g'), v);
  });

  // Pergunta variáveis customizadas
  const matches = conteudo.match(/\{\{[^}]+\}\}/g) || [];
  const unique = [...new Set(matches)];
  unique.forEach(v => {
    const valor = prompt(`Valor para ${v}:`);
    if (valor !== null) {
      conteudo = conteudo.replace(new RegExp(v.replace(/[{}]/g, '\\$&'), 'g'), valor);
    }
  });

  // Copia para clipboard
  navigator.clipboard.writeText(conteudo);
  showToast('Template preenchido e copiado!', 'success');
}

function loadTemplates() {
  const templates = JSON.parse(localStorage.getItem('drfuturo_templates') || '[]');
  const list = document.getElementById('templates-list');
  if (!list) return;

  if (templates.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-text">Nenhum template. Crie um acima.</div></div>';
    return;
  }

  list.innerHTML = templates.map(t => `
    <div class="result-card">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-size:11px; color:var(--primary); text-transform:uppercase; letter-spacing:0.1em;">${t.categoria}</div>
          <h4>${escapeHtml(t.nome)}</h4>
          <div class="result-snippet">${escapeHtml(t.conteudo.slice(0, 200))}${t.conteudo.length > 200 ? '...' : ''}</div>
          <div style="font-size:10px; color:var(--muted); margin-top:4px;">
            ${new Date(t.createdAt).toLocaleDateString('pt-BR')}
            ${t.conteudo.match(/\{\{[^}]+\}\}/g) ? ' · Tem variáveis' : ''}
          </div>
        </div>
        <div style="display:flex; gap:4px;">
          <button onclick="useTemplate('${t.id}')" class="btn btn-sm btn-outline">Usar</button>
          <button onclick="deleteTemplate('${t.id}')" class="btn-icon" style="color:var(--accent);">🗑</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ============================================================
// INIT — carrega dados quando muda para as novas abas
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Popula select de prazos
  const prazoSelect = document.getElementById('prazo-tipo');
  if (prazoSelect) {
    prazoSelect.innerHTML = PRAZOS_PROCESSUAIS.map(p =>
      `<option value="${p.id}">${p.name} (${p.dias} dias ${p.tipo})</option>`
    ).join('');
  }

  // Data default = hoje
  const hoje = new Date().toISOString().split('T')[0];
  const dataInput = document.getElementById('prazo-data');
  if (dataInput) dataInput.value = hoje;
  const agendaData = document.getElementById('agenda-data');
  if (agendaData) agendaData.value = hoje;
});

// Intercepta troca de aba para carregar dados
const originalSwitchTab = window.switchTab;
if (originalSwitchTab) {
  window.switchTab = function(tabName) {
    originalSwitchTab(tabName);
    if (tabName === 'favoritos') loadFavoritos();
    if (tabName === 'agenda') loadAgenda();
    if (tabName === 'templates') loadTemplates();
  };
}

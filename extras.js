/* ============================================================
   drfuturo — Recursos Extras
   Áudio · Resumo para Cliente · Checklist · Honorários
   ============================================================ */

// ============================================================
// 1. TRANSCRIÇÃO DE ÁUDIO (Web Speech API)
// ============================================================

let recognition = null;
let isRecording = false;
let audioChunks = [];

function initAudio() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Seu navegador não suporta transcrição de áudio. Use Chrome.', 'error');
    return false;
  }
  return true;
}

function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  if (!initAudio()) return;

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.continuous = true;
  recognition.interimResults = true;

  const transcriptEl = document.getElementById('audio-transcript');
  const btn = document.getElementById('audio-btn');
  const statusEl = document.getElementById('audio-status');

  let finalText = transcriptEl.value;

  recognition.onstart = () => {
    isRecording = true;
    btn.textContent = '⏸ Parar';
    btn.classList.add('btn-danger');
    statusEl.innerHTML = '<span style="color:var(--accent);">● GRAVANDO...</span>';
    showToast('Gravação iniciada', 'success');
  };

  recognition.onresult = (event) => {
    let interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalText += transcript + ' ';
      } else {
        interimText += transcript;
      }
    }
    transcriptEl.value = finalText + (interimText ? `[${interimText}]` : '');
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  };

  recognition.onerror = (event) => {
    showToast('Erro: ' + event.error, 'error');
    stopRecording();
  };

  recognition.onend = () => {
    if (isRecording) {
      // Reinicia se parou inesperadamente
      try { recognition.start(); } catch {}
    }
  };

  recognition.start();
}

function stopRecording() {
  if (recognition) {
    isRecording = false;
    recognition.stop();
    recognition = null;
    const btn = document.getElementById('audio-btn');
    const statusEl = document.getElementById('audio-status');
    btn.textContent = '🎤 Iniciar';
    btn.classList.remove('btn-danger');
    statusEl.innerHTML = '<span style="color:var(--muted);">Pronto para gravar</span>';
    showToast('Gravação finalizada', 'success');
  }
}

async function sendAudioToAI() {
  const transcript = document.getElementById('audio-transcript').value.trim();
  if (!transcript) {
    showToast('Grave ou cole texto primeiro', 'error');
    return;
  }
  if (!hasConfig()) {
    showToast('Configure IA na aba Config', 'error');
    return;
  }

  const result = document.getElementById('audio-result');
  const btn = document.getElementById('audio-analyze-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Analisando...';
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Analisando transcrição com IA...</div></div>';

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT_CHAT },
      { role: 'user', content: `Analise a seguinte transcrição de áudio (depoimento, audiência, etc.) e produza:

1. RESUMO — síntese do que foi dito
2. PONTOS-CHAVE — 3-5 trechos mais importantes
3. CONTRADIÇÕES — se houver, aponte
4. POSSÍVEIS PERGUNTAS — 3 perguntas que o defensor deveria fazer
5. RISCO — avalie se há risco para defesa ou acusação

TRANSCRIÇÃO:
${transcript}` },
    ];

    const analysis = await callGLM(messages, { temperature: 0.5, maxTokens: 4000 });

    result.innerHTML = `
      <div style="font-family:'Courier New',monospace; font-size:13px; color:var(--fg); white-space:pre-wrap; line-height:1.6;">${escapeHtml(analysis)}</div>
      <div style="border-top:1px solid var(--border); margin-top:12px; padding-top:8px;">
        <button class="btn btn-sm btn-outline" onclick="exportToPDF(\`${analysis.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`, 'analise_audio', 'Análise de Áudio')">📑 PDF</button>
        <button class="btn btn-sm btn-outline" onclick="exportToDocx(\`${analysis.replace(/`/g, "\\`").replace(/\$/g, "\\$")}\`, 'analise_audio', 'Análise de Áudio')">📄 Word</button>
      </div>
    `;
    showToast('Análise pronta!', 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${escapeHtml(err.message)}</div></div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Analisar com IA';
  }
}

// ============================================================
// 2. RESUMO EXECUTIVO PARA CLIENTE
// ============================================================

async function gerarResumoCliente() {
  const titulo = document.getElementById('resumo-titulo').value.trim();
  const cliente = document.getElementById('resumo-cliente').value.trim();
  const caso = document.getElementById('resumo-caso').value.trim();
  const andamento = document.getElementById('resumo-andamento').value.trim();
  const proximosPassos = document.getElementById('resumo-passos').value.trim();

  if (!titulo || !caso) {
    showToast('Preencha pelo menos título e descrição do caso', 'error');
    return;
  }
  if (!hasConfig()) {
    showToast('Configure IA na aba Config', 'error');
    return;
  }

  const result = document.getElementById('resumo-result');
  const btn = document.getElementById('resumo-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="loading-spinner"></span> Gerando...';
  result.innerHTML = '<div class="empty-state"><div class="loading-spinner"></div><div class="empty-text">Gerando resumo em linguagem acessível...</div></div>';

  try {
    const messages = [
      { role: 'system', content: 'Você é um advogado comunicando um cliente sobre o andamento do processo. Use linguagem LEIGA, sem juridiquês. Seja claro, objetivo e tranquilizador. Não prometa resultados. Use frases curtas.' },
      { role: 'user', content: `Gere um resumo executivo para o cliente sobre o andamento do processo:

TÍTULO: ${titulo}
${cliente ? `CLIENTE: ${cliente}` : ''}
${caso ? `CASO: ${caso}` : ''}
${andamento ? `ANDAMENTO ATUAL: ${andamento}` : ''}
${proximosPassos ? `PRÓXIMOS PASSOS: ${proximosPassos}` : ''}

Formato:
1. RESUMO (2-3 frases simples sobre o caso)
2. SITUAÇÃO ATUAL (o que aconteceu até agora)
3. PRÓXIMOS PASSOS (o que vai acontecer)
4. OBSERVAÇÕES (se houver, com linguagem acessível)

Não use termos jurídicos. Se usar, explique entre parênteses.` },
    ];

    const resumo = await callGLM(messages, { temperature: 0.4, maxTokens: 2000 });

    result.innerHTML = `
      <div class="piece-info-card">
        <h4>${escapeHtml(titulo)}</h4>
        ${cliente ? `<div style="font-size:12px; color:var(--fg-soft); margin-top:4px;">Cliente: ${escapeHtml(cliente)}</div>` : ''}
        <div style="font-size:10px; color:var(--muted); margin-top:4px;">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      </div>
      <div style="font-family:'Courier New',monospace; font-size:13px; color:var(--fg); white-space:pre-wrap; line-height:1.6;">${escapeHtml(resumo)}</div>
      <div style="border-top:1px solid var(--border); margin-top:12px; padding-top:8px;">
        <button class="btn btn-sm btn-outline" onclick="exportResumoToPDF()">📑 PDF</button>
        <button class="btn btn-sm btn-outline" onclick="exportResumoToDocx()">📄 Word</button>
      </div>
    `;
    // Salva conteúdo para exportação
    window._resumoContent = resumo;
    window._resumoTitle = titulo;
    showToast('Resumo gerado!', 'success');
  } catch (err) {
    result.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">Erro: ${escapeHtml(err.message)}</div></div>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '✦ Gerar resumo';
  }
}

function exportResumoToPDF() {
  if (window._resumoContent) {
    exportToPDF(window._resumoContent, `resumo_${window._resumoTitle || 'cliente'}`, `Resumo para Cliente — ${window._resumoTitle || ''}`);
  }
}

function exportResumoToDocx() {
  if (window._resumoContent) {
    exportToDocx(window._resumoContent, `resumo_${window._resumoTitle || 'cliente'}`, `Resumo para Cliente — ${window._resumoTitle || ''}`);
  }
}

// ============================================================
// 3. CHECKLIST POR TIPO DE CASO
// ============================================================

const CHECKLISTS = {
  hc: {
    nome: 'Habeas Corpus',
    itens: [
      'Identificar se há coação ilegal ou ameaça à liberdade',
      'Verificar se não é caso de RESE ou apelação (Súmula 695 STF)',
      'Verificar se não se discute prova (Súmula 711 STF)',
      'Identificar autoridade coatora (juiz de 1º grau → TJ; ministro → STF)',
      'Qualificar completamente o paciente',
      'Descrever os fatos de forma enxuta',
      'Fundamentar com base legal (art. 647 e 648 CPP)',
      'Citar doutrina (Aury Lopes Jr, Pacelli, Nucci)',
      'Citar jurisprudência STJ/STF (verificar atualidade)',
      'Formular pedido liminar',
      'Formular pedido de mérito',
      'Verificar endereçamento correto',
      'Assinar com OAB',
      'Protocolar (físico ou PJe)',
    ],
  },
  juri: {
    nome: 'Tribunal do Júri',
    itens: [
      'Estudar todo o processo (denúncia, resposta, instrução)',
      'Identificar teses defensivas (negativa, excludente, desclassificação)',
      'Preparar questionário dos jurados (perfil, profissão, reações)',
      'Estratégia de recusas imotivadas (até 3, defesa começa)',
      'Preparar lista de testemunhas de defesa (até 5)',
      'Preparar perguntas para testemunhas de acusação',
      'Preparar perguntas para testemunhas de defesa',
      'Preparar interrogatório do cliente',
      'Redigir discurso de plenário (15-20 min)',
      'Preparar réplica (responder às teses do MP)',
      'Preparar tréplica (responder à tréplica do MP)',
      'Estudar precedentes STJ/STF sobre júri',
      'Verificar pedido de desaforamento se necessário',
      'Preparar pedido de absolvição fundamentado',
      'Estar com toga adequada',
      'Chegar com 1h de antecedência',
    ],
  },
  tráfico: {
    nome: 'Tráfico de Drogas (Lei 11.343/2006)',
    itens: [
      'Verificar legalidade da abordagem policial',
      'Verificar cadeia de custódia (art. 158-A CPP, Lei 13.964/19)',
      'Verificar auto de apresentação e apreensão',
      'Verificar laudo de constatação preliminar',
      'Verificar laudo definitivo (toxicológico)',
      'Verificar se há depoimento de testemunhas oculares',
      'Verificar se réu confessou — analisar validade',
      'Avaliar desclassificação para uso (art. 28)',
      'Verificar possibilidade de ANPP (art. 28-A CPP)',
      'Verificar dosimetria de pena (causas de aumento art. 40)',
      'Analisar situação prisional (preventiva, flagrante, liberdade)',
      'Preparar pedido de liberdade provisória',
      'Identificar testemunhas de defesa',
      'Preparar resposta à acusação (3 dias - Lei 11.343)',
      'Preparar memoriais',
    ],
  },
  homicidio: {
    nome: 'Homicídio',
    itens: [
      'Verificar tipificação (art. 121 CP: doloso, culposo, privilegiado, qualificado)',
      'Analisar exame cadavérico (causa mortis)',
      'Verificar nexo de causalidade (art. 13 CP)',
      'Identificar testemunhas oculares',
      'Verificar cadeia de custódia de provas materiais',
      'Analisar áudios, vídeos e mensagens',
      'Verificar depoimento do réu (se confessou)',
      'Avaliar tese de negativa de autoria',
      'Avaliar tese de legítima defesa (art. 25 CP)',
      'Avaliar tese de excesso doloso ou culposo',
      'Verificar possível desclassificação',
      'Analisar qualificadoras (art. 121, §2º)',
      'Preparar defesa para audiência de instrução',
      'Preparar interrogatório do cliente',
      'Identificar perito assistente se necessário',
      'Preparar memoriais com tese consolidada',
    ],
  },
  estupro: {
    nome: 'Crimes Sexuais',
    itens: [
      'Verificar tipificação (arts. 213-216-A CP)',
      'Verificar se vítima é vulnerável (menor 14 anos - art. 217-A)',
      'Analisar depoimento da vítima (depoimento especial?)',
      'Verificar protocolo de escuta (Lei 13.431/2017)',
      'Identificar testemunhas diretas e indiretas',
      'Verificar exames: corpo de delito, IML',
      'Analisar mensagens, redes sociais, áudios',
      'Verificar cadeia de custódia de provas digitais',
      'Avaliar tese de consentimento (se aplicável)',
      'Avaliar tese de atipicidade (relação afetiva)',
      'Preparar cuidado no interrogatório',
      'Preparar defesa respeitando vítima (evitar revitimização)',
      'Preparar memoriais',
      'Verificar possibilidade de ANPP',
    ],
  },
  revisao: {
    nome: 'Revisão Criminal',
    itens: [
      'Verificar trânsito em julgado da sentença',
      'Identificar hipótese do art. 621 CPP',
      'I: sentença contrária à lei ou evidência dos autos',
      'II: sentença fundada em depoimentos, exames ou documentos falsos',
      'III: descoberta de novas provas de inocência',
      'Coletar novas provas (testemunhal, documental, pericial)',
      'Demonstrar erro judiciário',
      'Demonstrar contradição na prova',
      'Preparar petição inicial autônoma',
      'Endereçar ao tribunal competente',
      'Requerer produção de prova',
      'Pedir nulidade ou absolvição',
      'Preparar para sustentação oral',
    ],
  },
};

function loadChecklist() {
  const tipo = document.getElementById('checklist-tipo').value;
  const list = document.getElementById('checklist-content');
  if (!tipo || !CHECKLISTS[tipo]) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div><div class="empty-text">Selecione um tipo de caso</div></div>';
    return;
  }

  const checklist = CHECKLISTS[tipo];
  const saved = JSON.parse(localStorage.getItem(`drfuturo_checklist_${tipo}`) || '[]');

  list.innerHTML = `
    <div class="piece-info-card">
      <h4>✅ Checklist: ${checklist.nome}</h4>
      <div style="font-size:11px; color:var(--muted); margin-top:4px;">${checklist.itens.length} itens · ${saved.filter(Boolean).length} concluídos</div>
    </div>
    <div style="margin-top:16px;">
      ${checklist.itens.map((item, i) => `
        <label style="display:flex; align-items:flex-start; gap:10px; padding:10px; background:var(--bg-soft); border-radius:6px; margin-bottom:6px; cursor:pointer; border-left:3px solid ${saved[i] ? 'var(--success)' : 'var(--border)'};">
          <input type="checkbox" ${saved[i] ? 'checked' : ''} onchange="toggleChecklistItem('${tipo}', ${i}, this.checked)" style="margin-top:2px; accent-color: var(--success);">
          <span style="font-size:12px; color:${saved[i] ? 'var(--muted)' : 'var(--fg)'}; ${saved[i] ? 'text-decoration:line-through;' : ''}">${escapeHtml(item)}</span>
        </label>
      `).join('')}
    </div>
    <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--border);">
      <button class="btn btn-sm btn-outline" onclick="resetChecklist('${tipo}')">🔄 Reiniciar checklist</button>
    </div>
  `;
}

function toggleChecklistItem(tipo, index, checked) {
  const saved = JSON.parse(localStorage.getItem(`drfuturo_checklist_${tipo}`) || '[]');
  saved[index] = checked;
  localStorage.setItem(`drfuturo_checklist_${tipo}`, JSON.stringify(saved));
  loadChecklist();
  if (checked) showToast('Item concluído ✓', 'success');
}

function resetChecklist(tipo) {
  if (!confirm('Reiniciar este checklist? Todos os itens marcados serão perdidos.')) return;
  localStorage.removeItem(`drfuturo_checklist_${tipo}`);
  loadChecklist();
  showToast('Checklist reiniciado');
}

// ============================================================
// 4. CALCULADORA DE HONORÁRIOS
// ============================================================

const TABELA_OAB = [
  { tipo: 'Consulta inicial (até 1h)', min: 200, max: 800, sugestao: 350 },
  { tipo: 'Consulta de seguimento (h)', min: 150, max: 600, sugestao: 250 },
  { tipo: 'Audiência (por sessão)', min: 1000, max: 5000, sugestao: 2000 },
  { tipo: 'Audiência de custódia', min: 800, max: 3000, sugestao: 1500 },
  { tipo: 'Tribunal do Júri', min: 5000, max: 30000, sugestao: 10000 },
  { tipo: 'Habeas Corpus', min: 1500, max: 10000, sugestao: 3000 },
  { tipo: 'Apelação', min: 1500, max: 8000, sugestao: 3000 },
  { tipo: 'Recurso Especial/Extraordinário', min: 3000, max: 20000, sugestao: 6000 },
  { tipo: 'Defesa completa (instrução)', min: 5000, max: 30000, sugestao: 10000 },
  { tipo: 'Acordo (percentual)', min: 10, max: 30, sugertao: 20, percentual: true },
  { tipo: 'Hora de trabalho (fora audiência)', min: 150, max: 600, sugestao: 300 },
];

function calcularHonorarios() {
  const tipo = document.getElementById('honorarios-tipo').value;
  const horas = parseFloat(document.getElementById('honorarios-horas').value) || 0;
  const complexidade = parseFloat(document.getElementById('honorarios-complexidade').value) || 1;
  const valorCausa = parseFloat(document.getElementById('honorarios-causa').value) || 0;

  const config = TABELA_OAB[tipo];
  if (!config) return;

  let valor = 0;
  let detalhe = '';

  if (config.percentual) {
    // Acordo - percentual sobre valor da causa
    valor = valorCausa * (config.sugertao / 100);
    detalhe = `${config.sugertao}% sobre R$ ${valorCausa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  } else if (horas > 0) {
    // Por hora
    valor = horas * config.sugestao * complexidade;
    detalhe = `${horas}h × R$ ${config.sugestao} × ${complexidade} (complexidade)`;
  } else {
    // Valor fixo
    valor = config.sugestao * complexidade;
    detalhe = `R$ ${config.sugestao} × ${complexidade} (complexidade)`;
  }

  // Limites da tabela OAB
  const min = config.percentual ? (valorCausa * config.min / 100) : config.min;
  const max = config.percentual ? (valorCausa * config.max / 100) : config.max;

  if (valor < min) valor = min;
  if (valor > max && !config.percentual) valor = max;

  document.getElementById('honorarios-resultado').innerHTML = `
    <div class="piece-info-card">
      <h4>${config.tipo}</h4>
      <div style="font-size:11px; color:var(--muted); margin-top:4px;">${escapeHtml(detalhe)}</div>
      <div style="font-size:24px; color:var(--primary); font-weight:700; margin-top:12px;">
        R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style="font-size:11px; color:var(--muted); margin-top:8px;">
        Faixa OAB: R$ ${min.toLocaleString('pt-BR')} — R$ ${max.toLocaleString('pt-BR')}<br>
        ${config.percentual ? 'Percentual sobre acordo' : `Sugestão: R$ ${config.sugestao.toLocaleString('pt-BR')}`}
      </div>
    </div>
    <div style="font-size:10px; color:var(--muted); margin-top:8px; font-style:italic;">
      Valores conforme tabela OAB. Ajuste conforme:<br>
      • Zona de atuação (capital, interior)<br>
      • Reputação e experiência do advogado<br>
      • Capacidade financeira do cliente<br>
      • Urgência do caso<br>
      • Complexidade jurídica real
    </div>
  `;
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Popula select de honorários
  const honSelect = document.getElementById('honorarios-tipo');
  if (honSelect) {
    honSelect.innerHTML = TABELA_OAB.map((t, i) =>
      `<option value="${i}">${t.tipo}</option>`
    ).join('');
  }

  // Popula select de checklist
  const checkSelect = document.getElementById('checklist-tipo');
  if (checkSelect) {
    checkSelect.innerHTML = '<option value="">Selecione...</option>' +
      Object.entries(CHECKLISTS).map(([k, v]) =>
        `<option value="${k}">${v.nome}</option>`
      ).join('');
  }
});

// Intercepta troca de aba
const _origSwitch = window.switchTab;
if (_origSwitch) {
  window.switchTab = function(tabName) {
    _origSwitch(tabName);
    if (tabName === 'vade-mecum') {} // busca é sob demanda
    if (tabName === 'checklist') loadChecklist();
  };
}

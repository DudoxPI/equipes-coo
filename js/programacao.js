/* ═══════════════════════════════════════
   PROGRAMAÇÃO — semana, dias, equipes
   ═══════════════════════════════════════ */

let semAtual     = null;
let diaAtual     = null;
let formIdx      = -1;
let ausCardOpen  = false;  // card de ausências começa recolhido
let dispCardOpen = false;  // card de disponíveis começa recolhido
let formMembros    = [];
let formAtividades = [];
let selCallback = null;
let selItens    = [];

// ── Semana / Dia ──
function initSemana() {
  const hoje = new Date();
  if (hoje.getDay() === 0) {
    const s = new Date(hoje);
    s.setDate(hoje.getDate() + 1);
    semAtual = getSeg(s);
  } else {
    semAtual = getSeg(hoje);
  }
  // Sempre abre na semana atual; seleciona hoje se dia útil, senão segunda
  const dias     = getDias(semAtual);
  const hojeFmt  = fmtD(hoje);
  diaAtual = dias.includes(hojeFmt) ? hojeFmt : dias[0];
}

function mudarSemana(dir) {
  semAtual = new Date(semAtual);
  semAtual.setDate(semAtual.getDate() + dir * 7);
  prog.semanaInicio = fmtD(semAtual);
  diaAtual = getDias(semAtual)[0];
  salvar();
  renderSemana();
}

function selDia(d) {
  diaAtual = d;
  renderSemana();
}

// ── Render semana ──
function renderSemana() {
  const dias = getDias(semAtual);
  document.getElementById('semLbl').textContent = fmtBR(dias[0]) + ' — ' + fmtBR(dias[4]);
  document.getElementById('dtabs').innerHTML = dias.map((d, i) => {
    const a    = d === diaAtual ? 'active' : '';
    const n    = parseInt(d.split('-')[2]);
    const eq   = getEqs(d);
    const aus  = banco.funcionarios.filter(f => isAusenteNoDia(f, d)).length;
    const dc   = eq.length === 0 ? 'Sem prog.' : eq.length + ' prog.';
    const da   = aus > 0 ? `<div class="da">${aus} ausente${aus > 1 ? 's' : ''}</div>` : '';
    return `<div class="dtab ${a}" onclick="selDia('${d}')">
      <div class="dn">${DN[i]}</div>
      <div class="dd">${n}</div>
      <div class="dc">${dc}</div>
      ${da}
    </div>`;
  }).join('');
  renderDia();
}

// ── Render dia ──
function renderDia() {
  const ct  = document.getElementById('dayContent');
  const eqs = getEqs(diaAtual);

  // Mostra/esconde FABs
  const fab = document.getElementById('fabRow');
  if (fab) fab.classList.toggle('visible', eqs.length > 0);

  const ausCard  = renderAusenciasCard();
  const dispCard = renderDisponiveisCard();
  const statusRow = (ausCard || dispCard)
    ? `<div class="status-row">${ausCard}${dispCard}</div>` : '';

  if (!eqs.length) {
    ct.innerHTML = statusRow + `<div class="empty">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="4" width="18" height="18" rx="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>Nenhuma equipe neste dia</div>`;
    return;
  }

  ct.innerHTML = statusRow + eqs.map((eq, i) => {
    const lider = nomePorId(banco.funcionarios, eq.lider) || 'Sem líder';
    const area  = nomePorId(banco.areas, eq.area);
    const ativs = (eq.atividades || []).map(aid => nomePorId(banco.atividades, aid)).filter(Boolean);
    const membs = (eq.membros    || []).map(mid => nomePorId(banco.funcionarios, mid)).filter(Boolean);

    let html = `<div class="eq-card" onclick="abrirFormEquipe(${i})">`;
    html += `<div class="eq-top">
      <div class="eq-lider">${lider}</div>
      <div class="eq-actions">
        <span class="eq-badge">Equipe ${i + 1}</span>
        <button class="eq-act-btn eq-del" onclick="event.stopPropagation();removerEquipe(${i})" title="Remover">✕</button>
      </div>
    </div>`;
    if (area) {
      html += `<div class="eq-info"><span class="eq-chip area">${area}</span></div>`;
    }
    if (ativs.length) {
      html += '<div class="eq-info">';
      ativs.forEach(a => { html += `<span class="eq-chip ativ">${a}</span>`; });
      html += '</div>';
    }
    if (membs.length) {
      html += '<div class="eq-membros">';
      membs.forEach(m => { html += `<span class="eq-m">${m}</span>`; });
      html += '</div>';
    }
    if (eq.obs) html += `<div class="eq-obs">${eq.obs}</div>`;
    html += '</div>';
    return html;
  }).join('');
}

// ── Card de disponíveis (verde, recolhido) ──
function toggleDispCard() {
  dispCardOpen = !dispCardOpen;
  const body  = document.getElementById('dispCardBody');
  const arrow = document.getElementById('dispCardArrow');
  if (body)  body.classList.toggle('open', dispCardOpen);
  if (arrow) arrow.textContent = dispCardOpen ? '▲' : '▼';
}

function renderDisponiveisCard() {
  if (!banco.funcionarios.length) return '';
  const usados = new Set();
  getEqs(diaAtual).forEach(eq => {
    if (eq.lider) usados.add(eq.lider);
    (eq.membros || []).forEach(m => usados.add(m));
  });
  const livres = alpha(banco.funcionarios).filter(f => !usados.has(f.id) && !isAusenteNoDia(f, diaAtual));
  if (!livres.length) return '';

  const rows = livres.map(f =>
    `<span class="disp-chip">${f.nome}</span>`
  ).join('');

  return `<div class="disp-card">
    <div class="disp-card-hdr" onclick="toggleDispCard()">
      <div class="disp-card-left">
        <span class="disp-card-title">Disponíveis</span>
        <span class="disp-card-count">${livres.length}</span>
      </div>
      <span class="disp-card-arrow" id="dispCardArrow">${dispCardOpen ? '▲' : '▼'}</span>
    </div>
    <div class="disp-card-body${dispCardOpen ? ' open' : ''}" id="dispCardBody">
      <div class="disp-chips-wrap">${rows}</div>
    </div>
  </div>`;
}

// ── Card de ausências (topo do dia) ──
function toggleAusCard() {
  ausCardOpen = !ausCardOpen;
  const body  = document.getElementById('ausCardBody');
  const arrow = document.getElementById('ausCardArrow');
  if (body)  body.classList.toggle('open', ausCardOpen);
  if (arrow) arrow.textContent = ausCardOpen ? '▲' : '▼';
}

function renderAusenciasCard() {
  const ausentes = banco.funcionarios.filter(f => isAusenteNoDia(f, diaAtual));
  if (!ausentes.length) return '';

  // Agrupa por tipo mantendo ordem visual
  const ORDEM = ['ferias', 'viagem', 'folga', 'dayoff', 'atestado', 'falta', 'afastamento'];
  const grupos = {};
  ausentes.forEach(f => {
    const aus = (f.ausencias || []).find(a => {
      if (diaAtual < a.inicio) return false;
      return a.fim === null || a.fim === undefined || diaAtual <= a.fim;
    });
    const tipo = aus ? aus.tipo : 'falta';
    if (!grupos[tipo]) grupos[tipo] = [];
    grupos[tipo].push({ f, aus });
  });

  // Chips de resumo no cabeçalho
  const sumChips = ORDEM.filter(t => grupos[t]).map(t =>
    `<span class="aus-sum-chip aus-sum-${t === 'dayoff' ? 'folga' : t}">${TIPO_EMOJI[t]} ${TIPO_LABEL[t]} <b>${grupos[t].length}</b></span>`
  ).join('');

  // Linhas detalhadas no corpo
  const SEM_FIM_TIPOS = new Set(['falta', 'afastamento']);
  const rows = ORDEM.filter(t => grupos[t]).map(t => {
    const pills = grupos[t].map(({ f, aus }) => {
      const tc = t === 'dayoff' ? 'folga' : t;
      const ret = !aus || aus.fim === null
        ? `<span class="aus-ret">em aberto</span>`
        : aus.fim === aus.inicio
          ? ''   // falta: dia único, não precisa mostrar retorno
          : `<span class="aus-ret">Fim ${fmtBR(aus.fim)}</span>`;
      return `<span class="aus-name-pill aus-np-${tc}">${f.nome}${ret}</span>`;
    }).join('');
    const tc = t === 'dayoff' ? 'folga' : t;
    return `<div class="aus-row">
      <span class="aus-row-lbl">${TIPO_EMOJI[t]} ${TIPO_LABEL[t]}</span>
      <div class="aus-row-names">${pills}</div>
    </div>`;
  }).join('');

  return `<div class="aus-card">
    <div class="aus-card-hdr" onclick="toggleAusCard()">
      <div class="aus-card-left">
        <span class="aus-card-title">Ausências hoje</span>
        <span class="aus-card-count">${ausentes.length}</span>
      </div>
      <span class="aus-card-arrow" id="ausCardArrow">${ausCardOpen ? '▲' : '▼'}</span>
    </div>
    <div class="aus-card-body${ausCardOpen ? ' open' : ''}" id="ausCardBody">${rows}</div>
  </div>`;
}

function removerEquipe(i) {
  getEqs(diaAtual).splice(i, 1);
  salvar();
  renderSemana();
  toast('Equipe removida');
}

// ── Copiar / Limpar ──
function copiarDiaAnterior() {
  const dias = getDias(semAtual);
  const idx  = dias.indexOf(diaAtual);
  if (idx <= 0) { toast('Sem dia anterior'); return; }
  const ant = getEqs(dias[idx - 1]);
  if (!ant.length) { toast('Dia anterior vazio'); return; }
  prog.dias[diaAtual] = { equipes: JSON.parse(JSON.stringify(ant)).map(e => ({ ...e, id: uid() })) };
  salvar();
  renderSemana();
  toast('✓ Copiado!');
}
function limparDia() {
  prog.dias[diaAtual] = { equipes: [] };
  salvar();
  renderSemana();
  toast('Dia limpo');
}

// ── Validação ──
function lideresUsados(excIdx) {
  const s = new Set();
  getEqs(diaAtual).forEach((eq, i) => { if (i !== excIdx && eq.lider) s.add(eq.lider); });
  return s;
}
function pessoasUsadas(excIdx) {
  const s = new Set();
  getEqs(diaAtual).forEach((eq, i) => {
    if (i !== excIdx) {
      if (eq.lider) s.add(eq.lider);
      (eq.membros || []).forEach(m => s.add(m));
    }
  });
  return s;
}

// ── Form equipe ──
function abrirFormEquipe(idx) {
  formIdx = idx;
  const eqs = getEqs(diaAtual);
  let eq;
  if (idx === -1) {
    eq = { id: uid(), lider: '', membros: [], area: '', atividades: [], obs: '' };
    document.getElementById('formTitle').textContent = 'Nova Equipe';
  } else {
    eq = eqs[idx];
    document.getElementById('formTitle').textContent = 'Editar Equipe ' + (idx + 1);
  }

  const usados = pessoasUsadas(idx);
  const sel = document.getElementById('fLider');
  sel.innerHTML = '<option value="">Selecionar líder...</option>' +
    alpha(banco.funcionarios).map(f => {
      const dis     = usados.has(f.id) ? 'disabled' : '';
      const s       = eq.lider === f.id ? 'selected' : '';
      const ausente = isAusenteNoDia(f, diaAtual);
      let lbl = f.nome;
      if (usados.has(f.id))       lbl += ' (ocupado)';
      else if (ausente)            lbl += ' (ausente)';
      return `<option value="${f.id}" ${s} ${dis}>${lbl}</option>`;
    }).join('');

  const asel = document.getElementById('fArea');
  asel.innerHTML = '<option value="">Selecionar área...</option>' +
    alpha(banco.areas).map(a => `<option value="${a.id}" ${eq.area === a.id ? 'selected' : ''}>${a.nome}</option>`).join('');

  formMembros    = [...(eq.membros    || [])];
  formAtividades = [...(eq.atividades || [])];
  renderFormMembros();
  renderFormAtiv();
  document.getElementById('fObs').value = eq.obs || '';
  document.getElementById('modalForm').classList.add('open');
}

function renderFormMembros() {
  const w = document.getElementById('fMembrosWrap');
  if (!formMembros.length) { w.innerHTML = '<span class="tph">Toque para selecionar</span>'; return; }
  w.innerHTML = formMembros.map(mid => {
    const n = nomePorId(banco.funcionarios, mid);
    return `<span class="tag mb">${n}<span class="x" onclick="event.stopPropagation();rmFormMembro('${mid}')">✕</span></span>`;
  }).join('');
}
function rmFormMembro(mid) { formMembros = formMembros.filter(m => m !== mid); renderFormMembros(); }

function renderFormAtiv() {
  const w = document.getElementById('fAtivWrap');
  if (!formAtividades.length) { w.innerHTML = '<span class="tph">Toque para selecionar</span>'; return; }
  w.innerHTML = formAtividades.map(aid => {
    const n = nomePorId(banco.atividades, aid);
    return `<span class="tag at">${n}<span class="x" onclick="event.stopPropagation();rmFormAtiv('${aid}')">✕</span></span>`;
  }).join('');
}
function rmFormAtiv(aid) { formAtividades = formAtividades.filter(a => a !== aid); renderFormAtiv(); }

function salvarForm() {
  const lider = document.getElementById('fLider').value;
  const area  = document.getElementById('fArea').value;
  const obs   = document.getElementById('fObs').value.trim();
  if (!lider) { toast('Selecione um líder'); return; }

  const eq = {
    id: uid(), lider,
    membros:    [...formMembros].filter(m => m !== lider),
    area,
    atividades: [...formAtividades],
    obs
  };
  const eqs = getEqs(diaAtual);
  if (formIdx === -1) eqs.push(eq);
  else { eq.id = eqs[formIdx].id; eqs[formIdx] = eq; }

  fecharForm();
  salvar();
  renderSemana();
  toast(formIdx === -1 ? '✓ Equipe adicionada!' : '✓ Equipe atualizada!');
}
function fecharForm() { document.getElementById('modalForm').classList.remove('open'); }

// ── Seletor ──
function abrirSeletor(tipo) {
  if (tipo === 'membros') {
    const liderAtual  = document.getElementById('fLider').value;
    const usados      = pessoasUsadas(formIdx);
    const selecionados = new Set(formMembros);
    document.getElementById('selTitle').textContent = 'Selecionar Membros';
    document.getElementById('selDesc').textContent  = 'Já alocados em outra equipe ficam desabilitados.';
    document.getElementById('selList').innerHTML = alpha(banco.funcionarios).map(f => {
      if (f.id === liderAtual) return '';
      const ocupado = usados.has(f.id) && !selecionados.has(f.id);
      const sel     = selecionados.has(f.id);
      const ausente = isAusenteNoDia(f, diaAtual) && !selecionados.has(f.id);
      const cls     = sel ? 'selected' : ocupado ? 'disabled' : '';
      const hint    = ocupado ? '<span class="mi-hint">alocado</span>' :
                      ausente ? '<span class="mi-hint">ausente</span>' : '';
      return `<div class="mi ${cls}" data-id="${f.id}" onclick="toggleSel(this)">
        <div class="mchk">${sel ? '✓' : ''}</div>
        <span>${f.nome}</span>${hint}
      </div>`;
    }).join('');
    selItens = [...selecionados];
    selCallback = ids => { formMembros = ids; renderFormMembros(); };
  } else {
    const selecionados = new Set(formAtividades);
    document.getElementById('selTitle').textContent = 'Selecionar Atividades';
    document.getElementById('selDesc').textContent  = 'Escolha uma ou mais atividades.';
    document.getElementById('selList').innerHTML = alpha(banco.atividades).map(a => {
      const sel = selecionados.has(a.id);
      return `<div class="mi ${sel ? 'selected' : ''}" data-id="${a.id}" onclick="toggleSel(this)">
        <div class="mchk">${sel ? '✓' : ''}</div>
        <span>${a.nome}</span>
      </div>`;
    }).join('');
    selItens = [...selecionados];
    selCallback = ids => { formAtividades = ids; renderFormAtiv(); };
  }
  document.getElementById('modalSel').classList.add('open');
}
function toggleSel(el) {
  if (el.classList.contains('disabled')) return;
  const id  = el.dataset.id;
  const idx = selItens.indexOf(id);
  if (idx === -1) { selItens.push(id); el.classList.add('selected'); el.querySelector('.mchk').textContent = '✓'; }
  else            { selItens.splice(idx, 1); el.classList.remove('selected'); el.querySelector('.mchk').textContent = ''; }
}
function confirmarSel() { if (selCallback) selCallback([...selItens]); fecharSel(); }
function fecharSel()    { document.getElementById('modalSel').classList.remove('open'); selCallback = null; selItens = []; }

// ── Init + renderTudo ──
function renderTudo() {
  initSemana();
  renderSemana();
  renderUltimaAtualizacao();
}

async function init() {
  carregarLocal();
  if (!temDadosLocal()) await carregarNuvem();
  initSemana();
  renderSemana();
  renderUltimaAtualizacao();
  syncDot('ok');
}

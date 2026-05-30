/* ═══════════════════════════════════════
   PROGRAMAÇÃO — semana, dias, equipes
   ═══════════════════════════════════════ */

let semAtual     = null;
let diaAtual     = null;
let formIdx      = -1;
let ausCardOpen  = false;  // card de ausências começa recolhido
let dispCardOpen = false;  // card de disponíveis começa recolhido
let formLider      = '';
let formArea       = '';
let formMembros    = [];
let formAtividades = [];
let formStep       = 0;

const FORM_STEPS = [
  { lbl: 'Líder',      render: () => renderChipsLider()   },
  { lbl: 'Área',       render: () => renderChipsArea()    },
  { lbl: 'Atividades', render: () => renderChipsAtiv()    },
  { lbl: 'Membros',    render: () => renderChipsMembros() },
  { lbl: 'Observação', render: () => {}                   },
];

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
    const todosF = [...(banco.lideres || []), ...banco.funcionarios];
    const aus    = todosF.filter(f => isAusenteNoDia(f, d)).length;
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
    const lider = nomePorId(banco.lideres || [], eq.lider) || nomePorId(banco.funcionarios, eq.lider) || 'Sem líder';
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
  const todosF   = [...(banco.lideres || []), ...banco.funcionarios];
  const ausentes = todosF.filter(f => isAusenteNoDia(f, diaAtual));
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

// ── Limpar ──
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

// ── Form equipe — chips inline ──
function abrirFormEquipe(idx) {
  formIdx = idx;
  const eqs = getEqs(diaAtual);
  let eq;
  if (idx === -1) {
    eq = { id: uid(), lider: '', membros: [], area: '', atividades: [], obs: '' };
  } else {
    eq = eqs[idx];
  }
  formLider      = eq.lider      || '';
  formArea       = eq.area       || '';
  formMembros    = [...(eq.membros    || [])];
  formAtividades = [...(eq.atividades || [])];
  document.getElementById('fObs').value = eq.obs || '';
  formStep = 0;
  renderStep();
  document.getElementById('modalForm').classList.add('open');
}

// ── Stepper ──
function renderStep() {
  // Dots de progresso
  document.getElementById('stepProgress').innerHTML =
    FORM_STEPS.map((_, i) => {
      const cls = i < formStep ? 'done' : i === formStep ? 'active' : '';
      return `<div class="step-dot ${cls}"></div>`;
    }).join('');

  // Rótulo da etapa
  document.getElementById('stepLbl').textContent = FORM_STEPS[formStep].lbl;

  // Mostra apenas o pane ativo
  document.querySelectorAll('.step-pane').forEach((p, i) =>
    p.classList.toggle('hidden', i !== formStep)
  );

  // Renderiza conteúdo da etapa
  FORM_STEPS[formStep].render();

  // Voltar: oculto no passo 0
  document.getElementById('btnVoltar').style.display = formStep === 0 ? 'none' : '';

  // Próximo vira Salvar no último passo
  const btnP = document.getElementById('btnProximo');
  if (formStep === FORM_STEPS.length - 1) {
    btnP.textContent = '✓ Salvar';
    btnP.onclick = salvarForm;
  } else {
    btnP.textContent = 'Próximo →';
    btnP.onclick = stepProximo;
  }
}

function stepProximo() {
  if (formStep === 0 && !formLider) { toast('Selecione um líder'); return; }
  if (formStep < FORM_STEPS.length - 1) { formStep++; renderStep(); }
}
function stepAnterior() {
  if (formStep > 0) { formStep--; renderStep(); }
}

// ── Render chips ──
function renderChipsLider() {
  const usados = pessoasUsadas(formIdx);
  document.getElementById('fLiderChips').innerHTML =
    alpha(banco.lideres || []).map(f => {
      const ocupado   = usados.has(f.id);
      const ausente   = isAusenteNoDia(f, diaAtual);
      const bloqueado = ocupado || ausente;
      const sel       = f.id === formLider;
      const cls       = [sel ? 'sel-lider' : '', bloqueado && !sel ? 'disabled' : ''].filter(Boolean).join(' ');
      const hint      = ocupado ? `<span class="fchip-hint">(alocado)</span>`
                      : ausente ? `<span class="fchip-hint">(ausente)</span>` : '';
      return `<span class="fchip ${cls}" onclick="toggleFormLider('${f.id}')">${f.nome}${hint}</span>`;
    }).join('');
}

function renderChipsArea() {
  if (!banco.areas.length) {
    document.getElementById('fAreaChips').innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Nenhuma área cadastrada</span>';
    return;
  }
  document.getElementById('fAreaChips').innerHTML =
    alpha(banco.areas).map(a => {
      const sel = a.id === formArea;
      return `<span class="fchip ${sel ? 'sel-area' : ''}" onclick="toggleFormArea('${a.id}')">${a.nome}</span>`;
    }).join('');
}

function renderChipsAtiv() {
  if (!banco.atividades.length) {
    document.getElementById('fAtivChips').innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Nenhuma atividade cadastrada</span>';
    return;
  }
  document.getElementById('fAtivChips').innerHTML =
    alpha(banco.atividades).map(a => {
      const sel = formAtividades.includes(a.id);
      return `<span class="fchip ${sel ? 'sel-ativ' : ''}" onclick="toggleFormAtiv('${a.id}')">${a.nome}</span>`;
    }).join('');
}

function renderChipsMembros() {
  const usados = pessoasUsadas(formIdx);
  const lista  = alpha(banco.funcionarios).filter(f => f.id !== formLider);
  if (!lista.length) {
    document.getElementById('fMembrosChips').innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Nenhum funcionário disponível</span>';
    return;
  }

  // Agrupa por letra inicial com separadores
  let html = '';
  let letraAtual = '';
  for (const f of lista) {
    const letra = f.nome.trim().charAt(0).toUpperCase();
    if (letra !== letraAtual) {
      letraAtual = letra;
      html += `<div class="fchips-sep">${letra}</div>`;
    }
    const ocupado   = usados.has(f.id);
    const ausente   = isAusenteNoDia(f, diaAtual);
    const bloqueado = ocupado || ausente;
    const sel       = formMembros.includes(f.id);
    const cls       = [sel ? 'sel-membro' : '', bloqueado && !sel ? 'disabled' : ''].filter(Boolean).join(' ');
    const hint      = ocupado ? `<span class="fchip-hint">(alocado)</span>`
                    : ausente ? `<span class="fchip-hint">(ausente)</span>` : '';
    html += `<span class="fchip ${cls}" onclick="toggleFormMembro('${f.id}')">${f.nome}${hint}</span>`;
  }
  document.getElementById('fMembrosChips').innerHTML = html;
}

// ── Toggles ──
function toggleFormLider(id) {
  formLider   = (formLider === id) ? '' : id;
  formMembros = formMembros.filter(m => m !== id);
  renderChipsLider();
  renderChipsMembros();
}
function toggleFormArea(id)   { formArea = (formArea === id) ? '' : id; renderChipsArea(); }
function toggleFormAtiv(id)   { _toggleArr(formAtividades, id); renderChipsAtiv(); }
function toggleFormMembro(id) { _toggleArr(formMembros, id); renderChipsMembros(); }
function _toggleArr(arr, id)  { const i = arr.indexOf(id); i === -1 ? arr.push(id) : arr.splice(i, 1); }

function salvarForm() {
  if (!formLider) { toast('Selecione um líder'); return; }
  const obs = document.getElementById('fObs').value.trim();
  const eq  = {
    id: uid(), lider: formLider,
    membros:    [...formMembros].filter(m => m !== formLider),
    area:       formArea,
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

// ── Init + renderTudo ──
function renderTudo() {
  initSemana();
  renderSemana();
  renderUltimaAtualizacao();
}

async function init() {
  await carregarNuvem();
  initSemana();
  renderSemana();
  renderUltimaAtualizacao();
}

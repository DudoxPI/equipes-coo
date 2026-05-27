/* ═══════════════════════════════════════
   BANCO — CRUD funcionários, atividades, áreas e ausências
   ═══════════════════════════════════════ */

// TIPO_LABEL e TIPO_EMOJI estão em sync.js (compartilhados com programacao.js)

let ausFuncId = null; // ID do funcionário que está recebendo nova ausência

// Afastamento = sem data fim prevista; falta = dia único (fim = inicio automático)
const SEM_FIM = new Set(['afastamento']);

// ── Funcionários ──
function addFunc() {
  const i = document.getElementById('iFunc');
  const n = i.value.trim();
  if (!n) return;
  banco.funcionarios.push({ id: uid(), nome: n, ausencias: [] });
  i.value = '';
  salvar();
  renderBanco();
}
function delFunc(id) {
  banco.funcionarios = banco.funcionarios.filter(f => f.id !== id);
  salvar();
  renderBanco();
}

// ── Atividades ──
function addAtiv() {
  const i = document.getElementById('iAtiv');
  const n = i.value.trim();
  if (!n) return;
  banco.atividades.push({ id: uid(), nome: n });
  i.value = '';
  salvar();
  renderBanco();
}
function delAtiv(id) {
  banco.atividades = banco.atividades.filter(a => a.id !== id);
  salvar();
  renderBanco();
}

// ── Áreas ──
function addArea() {
  const i = document.getElementById('iArea');
  const n = i.value.trim();
  if (!n) return;
  banco.areas.push({ id: uid(), nome: n });
  i.value = '';
  salvar();
  renderBanco();
}
function delArea(id) {
  banco.areas = banco.areas.filter(a => a.id !== id);
  salvar();
  renderBanco();
}

// ── Ausências ──
function abrirModalAusencia(funcId) {
  ausFuncId = funcId;
  const f = banco.funcionarios.find(x => x.id === funcId);
  document.getElementById('ausModalFunc').textContent = f ? f.nome : '';
  document.getElementById('ausTipo').value   = 'ferias';
  document.getElementById('ausInicio').value = '';
  document.getElementById('ausFim').value    = '';
  ausOnTipo();
  document.getElementById('modalAusencia').classList.add('open');
}
function fecharModalAusencia() {
  document.getElementById('modalAusencia').classList.remove('open');
  ausFuncId = null;
}
function ausOnTipo() {
  const tipo = document.getElementById('ausTipo').value;
  // Afastamento = sem previsão; Falta = dia único (fim oculto, preenchido automático)
  document.getElementById('ausFimWrap').style.display =
    (SEM_FIM.has(tipo) || tipo === 'falta') ? 'none' : '';
}
function submitAusencia() {
  const tipo   = document.getElementById('ausTipo').value;
  const inicio = document.getElementById('ausInicio').value;
  if (!inicio) { toast('Informe a data'); return; }

  let fim;
  if (SEM_FIM.has(tipo))   fim = null;    // afastamento: sem previsão
  else if (tipo === 'falta') fim = inicio; // falta: só aquele dia
  else {
    fim = document.getElementById('ausFim').value;
    if (!fim)         { toast('Informe a data fim'); return; }
    if (fim < inicio) { toast('Data fim deve ser após o início'); return; }
  }
  const f = banco.funcionarios.find(x => x.id === ausFuncId);
  if (!f) return;
  if (!f.ausencias) f.ausencias = [];
  f.ausencias.push({ id: uid(), tipo, inicio, fim });
  fecharModalAusencia();
  salvar();
  renderBanco();
  toast('✓ Ausência registrada!');
}
function delAusencia(funcId, ausId) {
  const f = banco.funcionarios.find(x => x.id === funcId);
  if (!f) return;
  f.ausencias = (f.ausencias || []).filter(a => a.id !== ausId);
  salvar();
  renderBanco();
  toast('Ausência removida');
}

// ── Render ──
function renderBanco() {
  const svgUser = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
  const svgTask = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-6.5-1.5 1.5m-9 9-1.5 1.5m0-12 1.5 1.5m9 9 1.5 1.5"/></svg>`;
  const svgPin  = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>`;

  function ausLabel(a) {
    const lbl = TIPO_LABEL[a.tipo] || a.tipo;
    if (a.fim === null || a.fim === undefined) return `${lbl} ${fmtBR(a.inicio)} (aberto)`;
    if (a.fim === a.inicio)                   return `${lbl} ${fmtBR(a.inicio)}`; // falta: dia único
    return `${lbl} ${fmtBR(a.inicio)} – ${fmtBR(a.fim)}`;
  }

  // Funcionários com ausência registrada aparecem primeiro
  const funcOrdenados = [
    ...alpha(banco.funcionarios).filter(f => (f.ausencias || []).length > 0),
    ...alpha(banco.funcionarios).filter(f => !(f.ausencias || []).length),
  ];

  const lf = document.getElementById('lFunc');
  if (lf) lf.innerHTML = !banco.funcionarios.length
    ? `<div class="empty">${svgUser}Nenhum funcionário</div>`
    : funcOrdenados.map(f => {
        const aus = f.ausencias || [];
        const ausBadges = aus.map(a =>
          `<span class="aus-badge aus-${a.tipo === 'dayoff' ? 'folga' : a.tipo}" onclick="event.stopPropagation();delAusencia('${f.id}','${a.id}')" title="Clique para remover">${ausLabel(a)} ✕</span>`
        ).join('');
        return `<div class="irow irow-func">
          <div class="func-left">
            <span class="iname">${f.nome}</span>
            ${aus.length ? `<div class="aus-lista">${ausBadges}</div>` : ''}
            <button class="aus-add-btn" onclick="abrirModalAusencia('${f.id}')">+ Ausência</button>
          </div>
          <button class="idel" onclick="delFunc('${f.id}')">✕</button>
        </div>`;
      }).join('');

  const la = document.getElementById('lAtiv');
  if (la) la.innerHTML = !banco.atividades.length
    ? `<div class="empty">${svgTask}Nenhuma atividade</div>`
    : alpha(banco.atividades).map(a =>
        `<div class="irow"><span class="iname">${a.nome}</span><button class="idel" onclick="delAtiv('${a.id}')">✕</button></div>`
      ).join('');

  const lr = document.getElementById('lArea');
  if (lr) lr.innerHTML = !banco.areas.length
    ? `<div class="empty">${svgPin}Nenhuma área</div>`
    : alpha(banco.areas).map(a =>
        `<div class="irow"><span class="iname">${a.nome}</span><button class="idel" onclick="delArea('${a.id}')">✕</button></div>`
      ).join('');
}

// ── Init (banco.html) ──
async function init() {
  carregarLocal();
  if (!temDadosLocal()) await carregarNuvem();
  renderBanco();
  renderUltimaAtualizacao();
  syncDot('ok');
}

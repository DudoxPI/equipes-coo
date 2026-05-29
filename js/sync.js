/* ═══════════════════════════════════════
   SYNC — estado, localStorage e Gist
   ═══════════════════════════════════════ */

// ── Estado global ──
let banco = { lideres: [], funcionarios: [], atividades: [], areas: [] };
let prog  = { semanaInicio: '', dias: {}, atualizadoEm: null };

// ── Helpers ──
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const alpha = a  => [...a].sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
const fmtD  = d  => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};
const fmtBR = s  => { const [y, m, d] = s.split('-'); return d + '/' + m; };

function nomePorId(arr, id) {
  const f = arr.find(x => x.id === id);
  return f ? f.nome : '';
}
function getSeg(date) {
  const d = new Date(date);
  const w = d.getDay();
  d.setDate(d.getDate() - (w === 0 ? 6 : w - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}
function getDias(seg) {
  const a = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    a.push(fmtD(d));
  }
  return a;
}
function getEqs(d) {
  if (!prog.dias) prog.dias = {};
  if (!prog.dias[d]) prog.dias[d] = { equipes: [] };
  return prog.dias[d].equipes;
}
// Retorna true se o funcionário está ausente no dia informado (YYYY-MM-DD)
function isAusenteNoDia(func, dia) {
  return (func.ausencias || []).some(a => {
    if (dia < a.inicio) return false;
    if (a.fim === null || a.fim === undefined) return true; // falta / afastamento em aberto
    return dia <= a.fim;
  });
}

// Rótulos e emojis dos tipos de ausência (usados em ambas as páginas)
const TIPO_LABEL = {
  ferias:      'Férias',
  viagem:      'Viagem',
  folga:       'Folga',
  atestado:    'Atestado',
  falta:       'Falta',
  afastamento: 'Afastamento',
  dayoff:      'Folga',  // compat. com dados antigos
};
const TIPO_EMOJI = {
  ferias:      '🏖️',
  viagem:      '✈️',
  folga:       '🌟',
  atestado:    '🏥',
  falta:       '❌',
  afastamento: '🚑',
  dayoff:      '🌟',  // compat. com dados antigos
};

// ── UI helpers ──
function setLoad(v) { document.getElementById('loadOv').classList.toggle('open', v); }
function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('show'), 2400);
}
function syncDot(s) {
  const d = document.getElementById('syncDot');
  if (d) d.className = 'sync-dot ' + s;
}

// ── LocalStorage ──
function salvarLocal() {
  localStorage.setItem('c_banco', JSON.stringify(banco));
  localStorage.setItem('c_prog',  JSON.stringify(prog));
}
function carregarLocal() {
  try {
    const b = localStorage.getItem('c_banco');
    const p = localStorage.getItem('c_prog');
    if (b) banco = JSON.parse(b);
    if (p) prog  = JSON.parse(p);
  } catch (e) {}
}
function temDadosLocal() {
  return !!localStorage.getItem('c_banco');
}

// ── Gist ──
async function lerBin(arquivo) {
  const r = await fetch(BASE_GH + GIST_ID, {
    headers: { 'Authorization': 'Bearer ' + GH_TOKEN }
  });
  if (!r.ok) throw new Error('Gist fetch failed');
  return JSON.parse((await r.json()).files[arquivo].content);
}
async function salvarBin(arquivo, data) {
  const r = await fetch(BASE_GH + GIST_ID, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + GH_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ files: { [arquivo]: { content: JSON.stringify(data) } } })
  });
  return r.ok;
}

// ── Enviar / Carregar nuvem ──
async function enviarNuvem() {
  syncDot('loading');
  try {
    prog.atualizadoEm = new Date().toISOString();
    salvarLocal();
    const ok = await salvarBin('banco.json', banco) && await salvarBin('prog.json', prog);
    syncDot(ok ? 'ok' : 'err');
    if (ok) renderUltimaAtualizacao();
    else toast('Erro ao enviar');
  } catch (e) {
    syncDot('err');
    toast('Sem conexão');
  }
}
async function carregarNuvem() {
  syncDot('loading');
  setLoad(true);
  try {
    const [b, p] = await Promise.all([lerBin('banco.json'), lerBin('prog.json')]);
    banco = b || { lideres: [], funcionarios: [], atividades: [], areas: [] };
    prog  = p || { semanaInicio: '', dias: {}, atualizadoEm: null };
    salvarLocal();
    syncDot('ok');
    toast('✓ Dados carregados!');
    renderUltimaAtualizacao();
  } catch (e) {
    syncDot('err');
    toast('Erro ao carregar');
  } finally {
    setLoad(false);
  }
}
async function forcarDownload() {
  await carregarNuvem();
  if      (typeof renderTudo   === 'function') renderTudo();
  else if (typeof renderBanco  === 'function') renderBanco();
}

// Stale-while-revalidate: exibe local imediatamente, busca nuvem em background
// Só atualiza se a nuvem for mais recente que o local (compara timestamps ISO)
async function sincronizarNuvem() {
  try {
    syncDot('loading');
    const [b, p] = await Promise.all([lerBin('banco.json'), lerBin('prog.json')]);
    const tsNuvem = p?.atualizadoEm || '';
    const tsLocal = prog.atualizadoEm || '';
    if (tsNuvem > tsLocal) {
      banco = b || { lideres: [], funcionarios: [], atividades: [], areas: [] };
      prog  = p || { semanaInicio: '', dias: {}, atualizadoEm: null };
      salvarLocal();
      renderUltimaAtualizacao();
      if      (typeof renderTudo  === 'function') renderTudo();
      else if (typeof renderBanco === 'function') renderBanco();
      toast('✓ Dados atualizados!');
    }
    syncDot('ok');
  } catch (e) {
    syncDot('err'); // silent — app continua com local
  }
}

// Salva local + envia para nuvem (sem await — fire and forget)
function salvar() {
  salvarLocal();
  enviarNuvem();
}

// ── Última atualização ──
function renderUltimaAtualizacao() {
  const el = document.getElementById('lastUpdate');
  if (!el) return;
  if (!prog.atualizadoEm) { el.textContent = ''; return; }
  const d = new Date(prog.atualizadoEm);
  const p = n => String(n).padStart(2, '0');
  el.textContent = 'Última atualização: '
    + p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear()
    + ' às ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

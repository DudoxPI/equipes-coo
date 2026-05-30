/* ═══════════════════════════════════════
   SYNC — estado global e API
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

// ── API helpers ──
function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
function authHeaders() {
  return { 'Authorization': 'Bearer ' + getToken(), 'Content-Type': 'application/json' };
}

// ── API ──
async function lerNuvem() {
  const r = await fetch(API_BASE + '/data', { headers: authHeaders() });
  if (r.status === 401) { logout(); throw new Error('Não autorizado'); }
  if (!r.ok) throw new Error('Falha ao buscar dados');
  return r.json(); // { banco, prog }
}
async function salvarNuvem(b, p) {
  const r = await fetch(API_BASE + '/data', {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ banco: b, prog: p }),
  });
  if (r.status === 401) { logout(); return false; }
  return r.ok;
}

// ── Enviar / Carregar nuvem ──
async function enviarNuvem() {
  try {
    prog.atualizadoEm = new Date().toISOString();
    const ok = await salvarNuvem(banco, prog);
    if (ok) renderUltimaAtualizacao();
    else toast('Erro ao enviar');
  } catch (e) {
    toast('Sem conexão');
  }
}
async function carregarNuvem() {
  setLoad(true);
  try {
    const { banco: b, prog: p } = await lerNuvem();
    banco = b || { lideres: [], funcionarios: [], atividades: [], areas: [] };
    prog  = p || { semanaInicio: '', dias: {}, atualizadoEm: null };
    renderUltimaAtualizacao();
  } catch (e) {
    toast('Erro ao carregar');
  } finally {
    setLoad(false);
  }
}

// Envia para o servidor (sem await — fire and forget)
function salvar() {
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

# Plano: Adicionar Atividades e Locais com Coluna Cíclica

## Contexto
O usuário quer expandir o sistema de distribuição de equipes, adicionando dois novos tipos de entidades: **Atividade** e **Local**. A coluna direita da tela de Distribuição passará a ciclcar entre Liderados → Atividades → Locais usando setas. A atribuição de atividades/locais pode se repetir (o mesmo item fica disponível para múltiplos líderes). Os cards dos líderes sempre exibem tudo (liderados + atividades + locais) ao mesmo tempo. O CRUD de atividades e locais ficará em abas separadas no menu inferior (5 abas no total).

---

## Arquivo modificado
`C:\Users\Dudox\Curso_Python\IAcodes\gestao_equipes_antiga\index.html`

---

## Mudanças detalhadas

### 1. Dados (localStorage)
Adicionar 4 novas chaves:
```javascript
let atividades          = DB.get('atividades')          || [];
let locais              = DB.get('locais')              || [];
let distribuicaoAtiv    = DB.get('distribuicaoAtiv')    || {}; // { liderId: [atividadeId,...] } repetível
let distribuicaoLocais  = DB.get('distribuicaoLocais')  || {}; // { liderId: [localId,...] } repetível
```
Atualizar `save()` para persistir as 4 novas coleções.

Ao **adicionar um líder** (`addLider`): inicializar também `distribuicaoAtiv[lider.id] = []` e `distribuicaoLocais[lider.id] = []`.

Ao **deletar um líder** (`deleteLider`): fazer `delete distribuicaoAtiv[id]` e `delete distribuicaoLocais[id]`.

---

### 2. Estado da coluna cíclica
```javascript
const MODOS = ['liderados', 'atividades', 'locais'];
const MODO_LABEL = { liderados: 'Liderados', atividades: 'Atividades', locais: 'Locais' };
let modoColuna = 'liderados';

function ciclaModo(dir) { // dir = +1 ou -1
  const i = MODOS.indexOf(modoColuna);
  modoColuna = MODOS[(i + dir + MODOS.length) % MODOS.length];
  selectedFollower = null;
  draggedId = null;
  renderDistribuicao();
}
```

---

### 3. HTML — Cabeçalho da coluna direita com setas
Trocar `<div class="col-title">Liderados</div>` por:
```html
<div class="col-title-row">
  <button class="arrow-btn" onclick="ciclaModo(-1)">◀</button>
  <span id="colModoLabel">Liderados</span>
  <button class="arrow-btn" onclick="ciclaModo(1)">▶</button>
</div>
```

CSS para `.col-title-row` e `.arrow-btn`:
```css
.col-title-row {
  display:flex; align-items:center; gap:6px; margin-bottom:8px;
  font-size:11px; letter-spacing:1.2px; text-transform:uppercase;
  color:var(--text-muted); font-weight:600; padding-left:2px;
}
.arrow-btn {
  background:none; border:none; color:var(--text-muted);
  cursor:pointer; font-size:13px; padding:2px 4px;
  border-radius:4px; transition: color .15s, background .15s;
  line-height:1;
}
.arrow-btn:hover { color:var(--text); background:var(--surface2); }
```

---

### 4. Função `renderDistribuicao()` — atualizada
**Coluna esquerda (leader cards) — sempre exibe tudo:**
- Seção de liderados (já existia): chips dos liderados atribuídos
- Seção de atividades: se `distribuicaoAtiv[l.id]` tem itens, exibir chips com ícone 📌
- Seção de locais: se `distribuicaoLocais[l.id]` tem itens, exibir chips com ícone 📍
- Chips de atividade/local: botão ✕ chama `removeMembro(id, tipo, liderId, event)` que remove apenas daquele líder

**Coluna direita — baseada em `modoColuna`:**
- `'liderados'`: comportamento atual (filtra os não atribuídos, desaparece ao atribuir)
- `'atividades'`: mostra TODOS os atividades disponíveis (não filtra por atribuídos — ficam na lista sempre)
- `'locais'`: igual a atividades

Atualizar o label: `document.getElementById('colModoLabel').textContent = MODO_LABEL[modoColuna]`

**FAB visível** se qualquer distribuição tiver algo:
```javascript
const hasAny = assigned.size > 0 ||
  Object.values(distribuicaoAtiv).some(a => a.length > 0) ||
  Object.values(distribuicaoLocais).some(a => a.length > 0);
```

---

### 5. Drag & drop / clique — adaptar para tipo
Adicionar `draggedType` e `selectedFollowerType`:
```javascript
let draggedId = null;
let draggedType = null; // 'liderado' | 'atividade' | 'local'
let selectedFollower = null;
let selectedFollowerType = null;
```

`onDragStart(e, id, tipo)` — passa o tipo.
`onDrop(e, liderId)` — escolhe função de assign pelo tipo.
`onFollowerClick(id, tipo)` — guarda tipo.
`onLeaderClick(liderId)` — faz assign correto pelo tipo.

**Funções de assign para atividades e locais (repetível — NÃO remove de outros líderes):**
```javascript
function assignAtiv(atividadeId, liderId) {
  if(!distribuicaoAtiv[liderId]) distribuicaoAtiv[liderId] = [];
  distribuicaoAtiv[liderId].push(atividadeId);
  save();
}
function assignLocal(localId, liderId) {
  if(!distribuicaoLocais[liderId]) distribuicaoLocais[liderId] = [];
  distribuicaoLocais[liderId].push(localId);
  save();
}
```

**Remover de um líder específico (atividade/local):**
```javascript
function removeMembro(id, tipo, liderId, e) {
  if(e) e.stopPropagation();
  if(tipo === 'liderado') unassign(id);  // remove de todos (comportamento atual)
  else if(tipo === 'atividade') {
    const idx = distribuicaoAtiv[liderId]?.indexOf(id);
    if(idx !== -1) distribuicaoAtiv[liderId].splice(idx, 1);
    save();
  } else if(tipo === 'local') {
    const idx = distribuicaoLocais[liderId]?.indexOf(id);
    if(idx !== -1) distribuicaoLocais[liderId].splice(idx, 1);
    save();
  }
  renderDistribuicao();
}
```

---

### 6. CRUD Atividades e Locais
Padrão idêntico ao de Liderados:

**HTML — 2 novas páginas:**
```html
<div id="pageAtividades" class="page">
  <div class="section-title">Adicionar Atividade</div>
  <div class="add-form">
    <input id="inputAtividade" type="text" placeholder="Nome da atividade..." maxlength="30"/>
    <button class="add-btn" onclick="addAtividade()">+</button>
  </div>
  <div class="section-title">Lista</div>
  <div class="item-list" id="listAtividades"></div>
</div>

<div id="pageLocais" class="page">
  <div class="section-title">Adicionar Local</div>
  <div class="add-form">
    <input id="inputLocal" type="text" placeholder="Nome do local..." maxlength="30"/>
    <button class="add-btn" onclick="addLocal()">+</button>
  </div>
  <div class="section-title">Lista</div>
  <div class="item-list" id="listLocais"></div>
</div>
```

**JS — funções CRUD:**
- `addAtividade()`, `deleteAtividade(id)`, `renderAtividades()`
- `addLocal()`, `deleteLocal(id)`, `renderLocais()`
- `deleteAtividade` limpa o id de `distribuicaoAtiv` em todos os líderes
- `deleteLocal` idem para `distribuicaoLocais`

---

### 7. Bottom Nav — 5 abas
Adicionar 2 botões novos; ajustar CSS para comportar 5:
```css
.nav-btn { font-size:10px; } /* reduzir um pouco */
.nav-btn svg { width:20px; height:20px; }
```

Ícones sugeridos:
- Atividades: ícone de clipboard/lista (SVG)
- Locais: ícone de pin/marcador (SVG)

Atualizar `goTo()` para tratar `'Atividades'` e `'Locais'`.

---

### 8. Reset — por modo
O botão **"↺ Resetar distribuição"** reseta apenas o modo atual:
- `'liderados'`: limpa `distribuicao`
- `'atividades'`: limpa `distribuicaoAtiv`
- `'locais'`: limpa `distribuicaoLocais`

---

### 9. Dois botões FAB — "Gerar Coordenação" e "Gerar Equipes"
Substituir o FAB único por **dois botões fixos** lado a lado (acima do bottom-nav):

**FAB esquerdo — "Gerar Coordenação"** (abre modal com tudo):
```
📋 *Distribuição do dia DD/MM/YYYY*

👤 *Líder1*
  📌 Atividade1
  📍 Local1
  • Liderado1
  • Liderado2
```
Sequência por líder: **atividade → local → liderados**. Só exibe seções que tiverem itens.

**FAB direito — "Gerar Equipes"** (abre modal só com liderados — igual ao atual):
```
📋 *Distribuição do dia DD/MM/YYYY*

👤 *Líder1*
  • Liderado1
  • Liderado2
```
Apenas data + líderes + liderados (sem atividades nem locais).

**HTML dos FABs:**
```html
<div class="fab-row" id="fabRow">
  <button class="fab fab-left" onclick="openListaModal('coordenacao')">
    📋 Coordenação
  </button>
  <button class="fab fab-right" onclick="openListaModal('equipes')">
    👥 Equipes
  </button>
</div>
```

**CSS:**
```css
.fab-row {
  position:fixed; bottom:calc(var(--bottom-nav) + 16px);
  left:50%; transform:translateX(-50%);
  display:flex; gap:10px;
  opacity:0; pointer-events:none; transition:opacity .3s;
  z-index:150;
}
.fab-row.visible { opacity:1; pointer-events:all; }
.fab {
  background: linear-gradient(135deg, #7c6af7, #f76a8a);
  border:none; border-radius:40px;
  padding:13px 18px; color:#fff;
  font-family:'Syne',sans-serif; font-weight:700; font-size:13px;
  cursor:pointer; box-shadow:0 6px 24px rgba(124,106,247,0.45);
  transition: transform .2s; white-space:nowrap;
}
.fab:active { transform:scale(0.95); }
```

**JS — `openListaModal(tipo)`:**
```javascript
function openListaModal(tipo) {
  const txt = tipo === 'coordenacao' ? buildListaCoordenacao() : buildListaEquipes();
  document.getElementById('listaTexto').textContent = txt;
  document.getElementById('modalTipo').textContent = tipo === 'coordenacao' ? 'Coordenação 📋' : 'Equipes 👥';
  document.getElementById('modalLista').classList.add('open');
}
```

**`buildListaCoordenacao()`** → inclui liderados + atividades + locais por líder.  
**`buildListaEquipes()`** → igual à `buildLista()` atual (só liderados).

A **visibilidade** do `fab-row` depende de qualquer distribuição ter dados (igual ao critério atual do FAB).

---

## Verificação
1. Abrir `index.html` no navegador
2. Cadastrar líderes, liderados, atividades e locais nas respectivas abas
3. Na tela de Distribuição, clicar nas setas ◀/▶ e verificar que a coluna troca: Liderados → Atividades → Locais → Liderados
4. Arrastar/clicar atividades para líderes; verificar que o item **não some** da coluna (repetível)
5. Verificar que os cards dos líderes mostram liderados + atividades + locais com seus ícones
6. Clicar ✕ numa atividade de um líder; verificar que remove só daquele líder, e a atividade continua disponível na coluna
7. Clicar "↺ Resetar" em cada modo e verificar que reseta apenas aquele tipo
8. Clicar **"Gerar Coordenação"** → verificar que aparece tudo (liderados, 📌 atividades, 📍 locais) por líder
9. Clicar **"Gerar Equipes"** → verificar que aparece só data + líderes + liderados
10. Deletar uma atividade na aba Atividades; verificar que some dos cards dos líderes também

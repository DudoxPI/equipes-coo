# Plano: Gestão de Ausências de Funcionários

## Contexto

O app precisa controlar quando funcionários estão fora do trabalho para que o coordenador saiba quem está disponível para escalar em equipes. Existem 4 tipos de ausência com comportamentos diferentes:

| Tipo | Data início | Data fim | Comportamento |
|------|------------|----------|---------------|
| `ferias` | Obrigatória | Obrigatória | Intervalo fixo com data de retorno prevista |
| `viagem` | Obrigatória | Obrigatória | Intervalo fixo com data de retorno prevista |
| `dayoff` | Obrigatória | Obrigatória | Pode ser 1 ou mais dias corridos |
| `falta` | Obrigatória | Opcional (null) | Sem previsão de retorno |

Na tela de Programação, ausentes devem aparecer separados dos disponíveis para o dia visualizado.

---

## Arquivos a modificar (5 arquivos, nenhum novo)

### 1. `js/sync.js` — Helper de ausência

Adicionar após a função `getEqs()`:

```javascript
// Retorna true se o funcionário está ausente no dia informado (YYYY-MM-DD)
function isAusenteNoDia(func, dia) {
  return (func.ausencias || []).some(a => {
    if (dia < a.inicio) return false;
    if (a.fim === null || a.fim === undefined) return true; // falta em aberto
    return dia <= a.fim;
  });
}
```

> Usa comparação lexicográfica de strings ISO — correto para formato `YYYY-MM-DD`.

---

### 2. `js/banco.js` — CRUD de ausências

**a) Constantes no topo do arquivo:**
```javascript
const TIPO_LABEL = { ferias: 'Férias', viagem: 'Viagem', dayoff: 'Day off', falta: 'Falta' };
```

**b) Atualizar `renderBanco()`** — em cada item de funcionário, adicionar lista de ausências e botão "+ Ausência":
```html
<div class="aus-lista" id="aus-${f.id}">
  <!-- chips de ausência com botão × para deletar -->
</div>
<button class="aus-add-btn" onclick="abrirModalAusencia('${f.id}')">+ Ausência</button>
```

**c) Novas funções:**
- `abrirModalAusencia(funcId)` — preenche e abre `#modalAusencia`
- `fecharModalAusencia()` — fecha modal
- `ausOnTipo()` — listener no `<select>` de tipo: mostra/esconde campo "data fim" (oculto para `falta`)
- `submitAusencia()` — valida e adiciona ao array `func.ausencias`, chama `salvar()` + `renderBanco()`
- `delAusencia(funcId, ausId)` — remove do array, chama `salvar()` + `renderBanco()`

---

### 3. `banco.html` — Modal de nova ausência

Inserir antes do `</body>`:

```html
<!-- MODAL AUSÊNCIA -->
<div class="modal-ov" id="modalAusencia">
  <div class="modal-box">
    <div class="modal-hdr">
      <span id="ausModalTitle">Nova Ausência</span>
      <button class="modal-close" onclick="fecharModalAusencia()">✕</button>
    </div>
    <div class="modal-body">
      <label class="flbl">Tipo</label>
      <select id="ausTipo" onchange="ausOnTipo()">
        <option value="ferias">Férias</option>
        <option value="viagem">Viagem</option>
        <option value="dayoff">Day off</option>
        <option value="falta">Falta</option>
      </select>
      <label class="flbl">Data início</label>
      <input type="date" id="ausInicio"/>
      <div id="ausFimWrap">
        <label class="flbl">Data fim</label>
        <input type="date" id="ausFim"/>
      </div>
    </div>
    <div class="modal-foot">
      <button class="btn-sec" onclick="fecharModalAusencia()">Cancelar</button>
      <button class="btn-pri" onclick="submitAusencia()">Salvar</button>
    </div>
  </div>
</div>
```

---

### 4. `js/programacao.js` — Exibição na tela de Programação

**a) `renderDisponiveis()`** — dividir em duas seções:
- **Disponíveis (N)**: funcionários sem ausência no `diaAtual`
- **Ausentes hoje (N)**: funcionários com ausência no `diaAtual`, com chip colorido do tipo

```javascript
function renderDisponiveis() {
  if (!banco.funcionarios.length) return '';
  const usados = new Set();
  getEqs(diaAtual).forEach(eq => {
    if (eq.lider) usados.add(eq.lider);
    (eq.membros || []).forEach(m => usados.add(m));
  });
  const livres   = alpha(banco.funcionarios).filter(f => !usados.has(f.id) && !isAusenteNoDia(f, diaAtual));
  const ausentes = alpha(banco.funcionarios).filter(f => !usados.has(f.id) && isAusenteNoDia(f, diaAtual));
  let h = '';
  if (livres.length) {
    h += `<div class="disp-section"><span class="disp-lbl">Disponíveis (${livres.length})</span><div class="disp-chips">`;
    livres.forEach(f => { h += `<span class="disp-chip">${f.nome}</span>`; });
    h += '</div></div>';
  }
  if (ausentes.length) {
    h += `<div class="disp-section"><span class="disp-lbl aus-lbl">Ausentes hoje (${ausentes.length})</span><div class="disp-chips">`;
    ausentes.forEach(f => {
      const aus = (f.ausencias || []).find(a => isAusenteNoDia(f, diaAtual) && diaAtual >= a.inicio && (a.fim === null || diaAtual <= a.fim));
      // determinar tipo
      const tipo = aus ? aus.tipo : 'falta';
      h += `<span class="disp-chip aus-chip aus-chip-${tipo}">${f.nome}</span>`;
    });
    h += '</div></div>';
  }
  return h;
}
```

**b) `pessoasUsadas(excIdx)`** — ausentes ficam disponíveis para edição manual mas são sinalizados; sem mudança de lógica (o gestor pode alocar ausente se quiser).

**c) `abrirFormEquipe()` e `abrirSeletor()`** — adicionar hint `"(ausente)"` em funcionários ausentes no dia (similar ao hint `"(ocupado)"`).

---

### 5. `css/components.css` — Novos estilos

```css
/* Ausências no banco */
.aus-lista { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 6px; }
.aus-badge { font-size: .7rem; padding: 2px 8px; border-radius: 20px; font-weight: 600; }
.aus-badge.aus-ferias  { background: #1a3a5c; color: #7cb9ff; }
.aus-badge.aus-viagem  { background: #1a3a2a; color: #5ddc8c; }
.aus-badge.aus-dayoff  { background: #3a2a1a; color: #f0a060; }
.aus-badge.aus-falta   { background: #3a1a1a; color: #f06080; }
.aus-add-btn { font-size: .75rem; padding: 3px 10px; border: 1px dashed var(--line); border-radius: 20px; background: transparent; color: var(--muted); cursor: pointer; margin-top: 2px; }
.aus-add-btn:active { opacity: .7; }

/* Chips na tela de programação */
.disp-chip.aus-chip { opacity: .7; }
.aus-chip-ferias  { border: 1px solid #7cb9ff; color: #7cb9ff !important; }
.aus-chip-viagem  { border: 1px solid #5ddc8c; color: #5ddc8c !important; }
.aus-chip-dayoff  { border: 1px solid #f0a060; color: #f0a060!important; }
.aus-chip-falta   { border: 1px solid #f06080; color: #f06080 !important; }
.aus-lbl { color: var(--accent2) !important; }
```

---

### 6. `sw.js` — Versão do cache

Atualizar: `const CACHE = 'equipes-coo-v8';`

---

## Ordem de implementação

1. `css/components.css` — novos estilos (sem risco de quebrar nada)
2. `js/sync.js` — adicionar `isAusenteNoDia()`
3. `js/banco.js` — CRUD de ausências + `renderBanco()` atualizado
4. `banco.html` — modal de ausência
5. `js/programacao.js` — `renderDisponiveis()` + hints no seletor
6. `sw.js` — bump de versão (sempre por último)

---

## Verificação

1. Abrir banco.html → funcionário deve ter botão "+ Ausência"
2. Clicar "+ Ausência" → modal abre; selecionar "Falta" deve ocultar campo "data fim"
3. Salvar ausência → aparece como chip colorido no item do funcionário
4. Abrir index.html → no dia correspondente, ausente aparece em seção "Ausentes hoje"
5. Abrir seletor de membros → ausente aparece com hint "(ausente)"
6. Deletar ausência no banco → chip some, funcionário volta à seção "Disponíveis"
7. Testar no celular: garantir que modal de ausência abre e fecha corretamente

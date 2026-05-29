# Stepper "Nova Equipe" — Wizard de etapas

## Contexto
O modal atual mostra todos os campos de uma vez (chips de líder, área, atividade, membros e observação). O usuário quer transformá-lo em um wizard passo a passo, com dois botões fixos (Voltar / Próximo) na parte inferior. Cada etapa exibe apenas um campo, mantendo o foco e reduzindo a sobrecarga visual.

## Etapas do wizard
| # | Label | Campo | Obrigatório |
|---|---|---|---|
| 0 | Líder | chips single-select | ✅ Sim |
| 1 | Área | chips single-select | Não |
| 2 | Atividades | chips multi-select | Não |
| 3 | Membros | chips multi-select | Não |
| 4 | Observação | textarea | Não |

---

## Arquivos a modificar
- `index.html` — novo layout do modal com panes e footer fixo
- `js/programacao.js` — lógica de navegação entre etapas
- `css/components.css` — estilos do stepper (dots, panes, footer)

---

## 1. CSS (`css/components.css`)

Adicionar após `.fchip-hint`:

```css
/* ── STEPPER ── */
.modal-step { padding-bottom: 0 !important; display: flex; flex-direction: column; }

/* Indicador de progresso (5 pontos) */
.step-progress { display: flex; gap: 7px; justify-content: center; margin-bottom: 14px; }
.step-dot      { width: 7px; height: 7px; border-radius: 50%; background: var(--border); transition: all .25s; }
.step-dot.done { background: var(--accent); opacity: .35; }
.step-dot.active { background: var(--accent); transform: scale(1.35); }

/* Rótulo da etapa atual */
.step-lbl { font-size: 10px; font-weight: 700; letter-spacing: 1px;
            text-transform: uppercase; color: var(--text-muted); margin-bottom: 14px; }

/* Área de conteúdo scrollável */
.step-content { flex: 1; overflow-y: auto; min-height: 100px; }
.step-pane.hidden { display: none; }

/* Footer fixo com os botões */
.step-footer { flex-shrink: 0; display: flex; gap: 8px;
               padding: 14px 0 28px; margin-top: 14px;
               border-top: 1px solid var(--border);
               background: var(--surface); }
.mbtn.ghost  { background: var(--surface2); color: var(--text); }
.mbtn.ghost:hover { opacity: .85; }
```

---

## 2. HTML (`index.html`) — substituir conteúdo do #modalForm

```html
<!-- MODAL: FORM EQUIPE (stepper) -->
<div class="modal-bg" id="modalForm" onclick="if(event.target===this)fecharForm()">
  <div class="modal modal-step">
    <div class="modal-handle"></div>

    <!-- Indicador de progresso -->
    <div class="step-progress" id="stepProgress"></div>

    <!-- Título + rótulo da etapa -->
    <h3 id="formTitle">Nova Equipe</h3>
    <p class="step-lbl" id="stepLbl"></p>

    <!-- Panes — apenas o ativo é visível -->
    <div class="step-content">
      <div class="step-pane" id="step0">
        <div class="fchips" id="fLiderChips"></div>
      </div>
      <div class="step-pane hidden" id="step1">
        <div class="fchips" id="fAreaChips"></div>
      </div>
      <div class="step-pane hidden" id="step2">
        <div class="fchips" id="fAtivChips"></div>
      </div>
      <div class="step-pane hidden" id="step3">
        <div class="fchips" id="fMembrosChips"></div>
      </div>
      <div class="step-pane hidden" id="step4">
        <textarea class="finp" id="fObs" rows="3"
                  placeholder="Observações opcionais..."></textarea>
      </div>
    </div>

    <!-- Botões fixos no rodapé -->
    <div class="step-footer">
      <button class="mbtn ghost" id="btnVoltar" onclick="stepAnterior()">← Voltar</button>
      <button class="mbtn primary" id="btnProximo" onclick="stepProximo()">Próximo →</button>
    </div>
  </div>
</div>
```

---

## 3. JS (`js/programacao.js`)

### Nova variável global
```javascript
let formStep = 0;
```

### Definição das etapas (constante, junto das outras variáveis)
```javascript
const FORM_STEPS = [
  { lbl: 'Líder',      render: () => renderChipsLider()   },
  { lbl: 'Área',       render: () => renderChipsArea()    },
  { lbl: 'Atividades', render: () => renderChipsAtiv()    },
  { lbl: 'Membros',    render: () => renderChipsMembros() },
  { lbl: 'Observação', render: () => {}                   },
];
```

### `abrirFormEquipe(idx)` — adicionar reset de step
```javascript
// após carregar formLider, formArea, formMembros, formAtividades e fObs:
formStep = 0;
renderStep();
document.getElementById('modalForm').classList.add('open');
// remover as chamadas diretas a renderChipsLider/Area/Ativ/Membros
```

### Nova função `renderStep()`
```javascript
function renderStep() {
  const total = FORM_STEPS.length;

  // Dots de progresso
  document.getElementById('stepProgress').innerHTML =
    FORM_STEPS.map((_, i) => {
      const cls = i < formStep ? 'done' : i === formStep ? 'active' : '';
      return `<div class="step-dot ${cls}"></div>`;
    }).join('');

  // Rótulo
  document.getElementById('stepLbl').textContent = FORM_STEPS[formStep].lbl;

  // Panes
  document.querySelectorAll('.step-pane').forEach((p, i) =>
    p.classList.toggle('hidden', i !== formStep)
  );

  // Renderiza chips do passo atual
  FORM_STEPS[formStep].render();

  // Botão Voltar: oculto no passo 0
  const btnV = document.getElementById('btnVoltar');
  btnV.style.display = formStep === 0 ? 'none' : '';

  // Botão Próximo: vira "Salvar" no último passo
  const btnP = document.getElementById('btnProximo');
  if (formStep === total - 1) {
    btnP.textContent = '✓ Salvar';
    btnP.onclick = salvarForm;
  } else {
    btnP.textContent = 'Próximo →';
    btnP.onclick = stepProximo;
  }
}
```

### Funções de navegação
```javascript
function stepProximo() {
  if (formStep === 0 && !formLider) { toast('Selecione um líder'); return; }
  if (formStep < FORM_STEPS.length - 1) { formStep++; renderStep(); }
}
function stepAnterior() {
  if (formStep > 0) { formStep--; renderStep(); }
}
```

### `salvarForm()` — sem alteração no corpo, só garantir que chama `fecharForm()`
(já existe e está correto)

---

## Regra de disponibilidade (Líder e Membros)

**Desabilitado completamente** (`disabled` — sem clique, sem seleção):
- Funcionário ausente por qualquer motivo no dia (`isAusenteNoDia`)
- Funcionário já alocado em outra equipe do mesmo dia (`pessoasUsadas`)

Não existe mais a classe `.ausente` como estado separado — ausente = disabled.  
O hint `(ausente)` e `(alocado)` continua aparecendo dentro do chip para informar o motivo:

```javascript
// Exemplo para renderChipsLider():
const ocupado = usados.has(f.id);
const ausente = isAusenteNoDia(f, diaAtual);
const bloqueado = ocupado || ausente;
const hint = ocupado ? ' <span class="fchip-hint">(alocado)</span>'
           : ausente  ? ' <span class="fchip-hint">(ausente)</span>' : '';
const cls  = [sel ? 'sel-lider' : '', bloqueado ? 'disabled' : ''].filter(Boolean).join(' ');
```

Mesma lógica em `renderChipsMembros()`.  
CSS: remover `.fchip.ausente { opacity: .5 }` — não é mais necessário.

---

## Verificação
1. Clicar em "+ Nova Equipe" → abre no passo 0 (Líder), botão Voltar oculto
2. Tentar avançar sem líder → toast de erro
3. Selecionar líder → Próximo → passo 1 (Área), dots atualizados
4. Navegar Voltar → volta ao passo 0, seleção de líder preservada
5. Avançar até o passo 4 (Observação) → botão vira "✓ Salvar"
6. Salvar → equipe aparece no card do dia
7. Editar equipe existente → abre no passo 0 com chips pré-selecionados

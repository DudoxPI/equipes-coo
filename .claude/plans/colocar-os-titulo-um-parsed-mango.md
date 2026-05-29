# Plano: Remover "Copiar dia anterior" + seção Líderes no Banco

## Context
1. O botão "Copiar dia anterior" deve ser removido da tela de Programação.
2. O Banco precisa de uma nova seção **Líderes** — idêntica a Funcionários (com ausências completas). Na hora de escolher o líder no modal stepper, a lista virá apenas de `banco.lideres` (lista curada, pequena) em vez de `banco.funcionarios` (todos).

---

## Arquivos a modificar

| Arquivo | O que muda |
|---|---|
| `index.html` | Remove botão "Copiar dia anterior" |
| `js/programacao.js` | Remove função `copiarDiaAnterior()` + `renderChipsLider()` passa a ler `banco.lideres` |
| `js/sync.js` | Adiciona `lideres: []` ao estado inicial do banco (2 locais) |
| `js/banco.js` | Adiciona `addLider`, `delLider`; generaliza ausências para suportar líderes; atualiza `renderBanco()` |
| `banco.html` | Adiciona seção "Líderes" (antes de Funcionários) |

---

## Mudança 1 — Remover "Copiar dia anterior"

**`index.html`** — remover o `<button class="abtn" onclick="copiarDiaAnterior()">` e seu conteúdo (SVG + texto).

**`js/programacao.js`** — remover a função `copiarDiaAnterior()` (linhas 240–250).

---

## Mudança 2 — Estado inicial do banco

**`js/sync.js`** — adicionar `lideres: []` nos dois lugares onde banco é inicializado:
```js
// linha 6 (declaração)
let banco = { funcionarios: [], atividades: [], areas: [], lideres: [] };

// linha 142 (fallback carregarNuvem)
banco = b || { funcionarios: [], atividades: [], areas: [], lideres: [] };
```

---

## Mudança 3 — CRUD de Líderes em banco.js

Adicionar funções espelhando Funcionários (estrutura idêntica: `{ id, nome, ausencias: [] }`):
```js
function addLider() { /* lê #iLider, push para banco.lideres, salvar(), renderBanco() */ }
function delLider(id) { /* filtra banco.lideres, salvar(), renderBanco() */ }
```

**Generalizar ausências** para funcionar tanto com funcionários quanto com líderes.  
Adicionar variável `ausSource = 'funcionarios'` (default). Nas três funções:

- `abrirModalAusencia(id, source='funcionarios')` → salva `ausSource = source`
- `submitAusencia()` → usa `banco[ausSource].find(x => x.id === ausFuncId)`
- `delAusencia(funcId, ausId, source='funcionarios')` → usa `banco[source].find(...)`

**`renderBanco()`** — adicionar bloco para líderes (igual ao de funcionários, usando `banco.lideres`, `addLider`, `delLider`, `abrirModalAusencia(id,'lideres')`).

---

## Mudança 4 — HTML do Banco

**`banco.html`** — adicionar seção "Líderes" antes de "Funcionários":
```html
<p class="stitle">Líderes</p>
<div class="aform">
  <input type="text" id="iLider" placeholder="Nome do líder"
         onkeydown="if(event.key==='Enter')addLider()"/>
  <button class="abtn2" onclick="addLider()">+</button>
</div>
<div class="ilist" id="lLider"></div>
```

---

## Mudança 5 — Stepper: escolha do líder

**`js/programacao.js` — `renderChipsLider()`**  
Trocar `banco.funcionarios` por `banco.lideres`. A lógica de `ocupado`/`ausente` reaproveitada do `isAusenteNoDia()` funciona sem alteração (mesma estrutura de objeto).

---

## Verificação
1. **Banco.html** → nova seção "Líderes" aparece antes de Funcionários; adicionar/remover líderes funciona; ausências de líderes abrem o mesmo modal e salvam corretamente.
2. **Index.html** → botão "Copiar dia anterior" sumiu da toolbar do dia.
3. **Modal "Nova Equipe"** → passo 1 (Líder) lista apenas os líderes cadastrados em Banco → Líderes; ausentes/alocados mostram hint corretamente.

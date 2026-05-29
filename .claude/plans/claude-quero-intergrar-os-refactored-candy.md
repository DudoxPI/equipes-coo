# Plano: Integrar index_exemplo.html + index_dark.html

## Context

O usuário tem dois apps distintos:
- `equipes-coo/index_exemplo.html` — coordenador funcional com CRUD completo, drag-drop, swipe, exportação para WhatsApp; **mas** distribui em armazenamento global único (sem divisão por dia) e **sem sync na nuvem**.
- `equipes/index_dark.html` — visualização semanal bonita, sincronizada com GitHub Gist, **mas** read-only.

O objetivo é um **único PWA para coordenadores** que una:
- A funcionalidade completa de CRUD + distribuição do index_exemplo.html
- A visualização semanal do index_dark.html
- Sincronização com GitHub Gist
- Distribuição **por dia** (bug corrigido — hoje é global)
- Nova paleta de cores: #0511F2 / #323C73 / #14B5D9 / #B2E2F8 / #0D0D0D

**Output**: nova pasta independente `C:\Users\Dudox\Curso_Python\IAcodes\equipes_new\` — projeto separado, git próprio, ícones novos

---

## Modelo de Dados Novo

### Dois arquivos no Gist

**banco.json**
```json
{
  "lideres":    [{"id":"...", "nome":"...", "color":"..."}],
  "liderados":  [{"id":"...", "nome":"..."}],
  "atividades": [{"id":"...", "nome":"..."}],
  "locais":     [{"id":"...", "nome":"..."}]
}
```

**prog.json**
```json
{
  "dias": {
    "YYYY-MM-DD": {
      "dispensas":          ["lideradoId"],
      "distribuicao":       {"liderId": ["lideradoId"]},
      "distribuicaoAtiv":   {"liderId": ["atividadeId"]},
      "distribuicaoLocais": {"liderId": ["localId"]}
    }
  },
  "atualizadoEm": "ISO string"
}
```

**localStorage**: `c_banco` + `c_prog`

---

## Paleta CSS

```css
:root {
  --bg:           #0D0D0D;   /* near black */
  --surface:      #0b0e1e;   /* dark navy */
  --surface2:     #141829;   /* lighter navy */
  --border:       #232b50;   /* navy blue (derivado de #323C73) */
  --border2:      #323C73;   /* navy accent */
  --text:         #B2E2F8;   /* sky blue claro */
  --text-muted:   #4a6a8a;   /* azul acinzentado */
  --text-sub:     #7a9ec0;   /* intermediário */
  --accent:       #0511F2;   /* azul elétrico */
  --accent2:      #14B5D9;   /* ciano */
  --green:        #3de07a;
  --yellow:       #f5c842;
  --radius:       14px;
  --radius-sm:    8px;
  --bottom-nav:   104px;
}
```

---

## Navegação (5 abas — mantém reset strip)

| # | Nome | Ícone | Página |
|---|------|-------|--------|
| 1 | Hoje | grade 2x2 | `pageHoje` — distribuição diária |
| 2 | Semana | calendário | `pageSemana` — vista semanal |
| 3 | Líderes | perfil único | `pageLideres` |
| 4 | Liderados | perfil grupo | `pageLiderados` |
| 5 | Cadastros | clipboard | `pageCadastros` — Atividades + Locais juntos |

> Reset strip permanece acima das abas (só ativo na página Hoje)

---

## Funções-chave a implementar

### Config (início do script)
```js
const GH_TOKEN = 'ghp_...';   // usuário preenche
const GIST_ID  = '...';
const BASE_GH  = 'https://api.github.com/gists/';
```

### Helpers de data (novo)
```js
const getDiaKey = () => selectedDate.toISOString().split('T')[0];

const getDiaData = () => {
  if (!prog.dias) prog.dias = {};
  if (!prog.dias[getDiaKey()]) prog.dias[getDiaKey()] = {
    dispensas: [], distribuicao: {}, distribuicaoAtiv: {}, distribuicaoLocais: {}
  };
  return prog.dias[getDiaKey()];
};
```

### Sync (do index_dark.html — equipes-coo)
```js
lerGist(arquivo)        // GET /gists/{id} → JSON.parse
salvarGist(arquivo, d)  // PATCH /gists/{id}
salvarLocal()           // c_banco + c_prog em localStorage
carregarLocal()         // lê do localStorage
enviarNuvem()           // salvarGist banco + prog (fire-and-forget)
forcarDownload()        // carregarNuvem + renderTudo
syncDot(estado)         // loading / ok / err
```

### Distribuição (adaptada para per-day)
Todas as funções leem/escrevem em `getDiaData()` em vez de variáveis globais:
- `assign(lideradoId, liderId)` → `getDiaData().distribuicao`
- `unassign(lideradoId)` → idem
- `assignAtiv(atividadeId, liderId)` → `getDiaData().distribuicaoAtiv`
- `assignLocal(localId, liderId)` → `getDiaData().distribuicaoLocais`
- `toggleDispensa(id)` → `getDiaData().dispensas`
- `removeMembro(id, tipo, liderId, e)` → lê do getDiaData()
- `getAssigned()` → lê do getDiaData()

### Vista Semanal (novo — renderSemana)
- Navega ±1 semana (Seg a Sex)
- Para cada dia: pill colorida (5 cores por dia), número grande, lista de líderes com seus chips
- Hoje destacado com box-shadow
- Se dia vazio → "Sem distribuição"
- Read-only (não edita direto aqui)

---

## Estrutura HTML (páginas)

### `#pageHoje` (renomeado de pageDistribuicao)
Idêntico ao atual `pageDistribuicao` do index_exemplo.html — sem mudanças de layout.

### `#pageSemana` (novo)
```html
<div class="sem-nav">  <!-- setas ± semana -->
  <button class="arr" onclick="mudarSemana(-1)">◀</button>
  <span id="semLbl"></span>
  <button class="arr" onclick="mudarSemana(1)">▶</button>
</div>
<div class="week-card">
  <div id="weekContent"></div>  <!-- renderSemana() injeta aqui -->
</div>
```

### `#pageCadastros` (novo — combina Atividades + Locais)
Duas seções verticais com título, form de add e lista.

---

## Header

Adiciona ao header existente:
- `sync-dot` (substituindo o date-picker lateral ou ao lado dele)
- Botão "↓ Nuvem" (`forcarDownload()`)
- Mantém os botões ± dia e o display de data

---

## FAB / Modal

Mantém exatamente como está no index_exemplo.html:
- `openListaModal('coordenacao')` → `buildListaCoordenacao()` — usa todos os dias ou dia selecionado
- `openListaModal('equipes')` → `buildListaEquipes()` — idem

> As funções `buildLista*` vão ler de `getDiaData()` (dia selecionado), sem mudança na lógica de conteúdo.

---

## Reset

`resetDistribuicao()` agora limpa apenas o dia selecionado (`prog.dias[getDiaKey()] = {…vazio…}`), não todos os dias.

---

## Gestão de Ausências dos Liderados

### Quatro tipos de status

| Tipo | Duração | Onde salva | Comportamento |
|------|---------|-----------|---------------|
| 🏥 **Atestado** | Período (início → fim) | `banco.ausencias[]` | Afastamento médico; bloqueado em todo o período |
| 🌴 **Day off** | Período (início → fim) | `banco.ausencias[]` | Folga programada; pode ser mais de um dia |
| ✈️ **Viagem** | Período (início → fim) | `banco.ausencias[]` | Viagem a serviço; bloqueado em todo o período |
| ❌ **Falta** | Somente o dia atual | `prog.dias[date].falta[]` | Ausência não programada; só afeta aquele dia |

> Os três primeiros usam o **mesmo modelo de período** (`banco.ausencias[]`), diferenciados pelo campo `tipo`.  
> Somente a **falta** é pontual e fica em `prog` (por dia).

### Modelo de dados atualizado

**banco.json** — campo `ausencias` (substitui o antigo `dispensas`/`atestados`):
```json
{
  "lideres": [...],
  "liderados": [...],
  "atividades": [...],
  "locais": [...],
  "ausencias": [
    {"id": "uid1", "lideradoId": "abc", "tipo": "atestado", "inicio": "2026-05-26", "fim": "2026-05-30"},
    {"id": "uid2", "lideradoId": "def", "tipo": "dayoff",   "inicio": "2026-06-01", "fim": "2026-06-03"},
    {"id": "uid3", "lideradoId": "ghi", "tipo": "viagem",   "inicio": "2026-05-27", "fim": "2026-06-05"}
  ]
}
```

**prog.json** — cada dia tem apenas `falta` (ausências pontuais):
```json
{
  "dias": {
    "YYYY-MM-DD": {
      "falta":              ["lideradoId"],
      "distribuicao":       {"liderId": ["lideradoId"]},
      "distribuicaoAtiv":   {"liderId": ["atividadeId"]},
      "distribuicaoLocais": {"liderId": ["localId"]}
    }
  },
  "atualizadoEm": "ISO string"
}
```

> O antigo campo `dispensas` é removido e substituído por este sistema.

### UI — Como marcar o status

Na página **Liderados**, cada linha tem um botão `⋯` que abre um **bottom sheet** com as opções:

```
┌─────────────────────────────┐
│  Maria Silva                 │
│  ───────────────────────    │
│  🏥 Atestado  (período)      │
│  🌴 Day off   (período)      │
│  ✈️ Viagem    (período)      │
│  ❌ Falta     (só hoje)      │
│  ✓  Limpar status             │
└─────────────────────────────┘
```

- **Atestado / Day off / Viagem**: abre um segundo modal com dois `<input type="date">` — início e fim. O campo "início" é pré-preenchido com `selectedDate`. Ao confirmar, chama `marcarAusencia(id, tipo, inicio, fim)`.
- **Falta**: aplica imediatamente ao `selectedDate` atual — sem modal de datas. Chama `marcarFalta(id)`.
- **Limpar status**: remove `ausencias[]` ativas no período atual + falta do dia. Chama `limparStatus(id)`.

### Indicadores visuais

**Na página Liderados:**
| Status | Badge | Cor do badge | Nome |
|--------|-------|-------------|------|
| Atestado | 🏥 | vermelho (`--accent2`) | riscado |
| Day off | 🌴 | verde (`--green`) | riscado |
| Viagem | ✈️ | ciano (`--accent2`) | riscado |
| Falta | ❌ | cinza | riscado |

- Liderados com status agrupados no topo da lista
- Badge clicável abre o bottom sheet de edição/limpeza

**Na página Hoje (distribuição):**
- Liderados indisponíveis **não aparecem** na coluna direita
- Se já foram distribuídos e depois marcados (ex.: falta registrada após distribuição), aparecem com chip riscado no card do líder

### Funções-chave

```js
// Helper — verifica se liderado está disponível no dia selecionado
function isDisponivel(lideradoId) {
  const key = getDiaKey();
  // Ausência com período (atestado / dayoff / viagem)?
  const ausente = (banco.ausencias || []).find(a =>
    a.lideradoId === lideradoId && key >= a.inicio && key <= a.fim
  );
  if (ausente) return false;
  // Falta pontual no dia?
  const dia = getDiaData();
  if ((dia.falta || []).includes(lideradoId)) return false;
  return true;
}

// Retorna status ativo no dia (para exibir badge)
function getStatus(lideradoId) {
  const key = getDiaKey();
  const ausencia = (banco.ausencias || []).find(a =>
    a.lideradoId === lideradoId && key >= a.inicio && key <= a.fim
  );
  if (ausencia) return ausencia.tipo;   // 'atestado' | 'dayoff' | 'viagem'
  const dia = getDiaData();
  if ((dia.falta || []).includes(lideradoId)) return 'falta';
  return null;
}

// uid() → Date.now().toString(36) + Math.random().toString(36).slice(2)
marcarAusencia(id, tipo, inicio, fim)  // push em banco.ausencias + unassign no período + save
marcarFalta(id)                        // push em getDiaData().falta + unassign hoje + save
limparStatus(id)                       // remove ausencias ativas + falta do dia + save
```

### Impacto em renderDistribuicao()

Na coluna direita de liderados livres:
```js
const livres = liderados.filter(l =>
  !assigned.has(l.id) && isDisponivel(l.id)   // substitui o check de dispensas
);
```

---

## Verificação / Teste

1. Abrir `equipes-coo/index_exemplo.html` no browser (ou via `python -m http.server` na pasta)
2. Testar CRUD de líderes/liderados/atividades/locais → dados aparecem
3. Fazer distribuição no dia de hoje → chip aparece no card do líder
4. Mudar para amanhã (botão +) → distribuição do dia anterior fica salva, novo dia começa vazio
5. Voltar ao dia anterior → distribuição persiste ✓
6. Abrir aba Semana → ver distribuição da semana atual
7. Preencher `GH_TOKEN` + `GIST_ID` → clicar "↓ Nuvem" → `syncDot` fica verde
8. Testar FAB "Coordenação" e "Equipes" → modal abre com texto correto para WhatsApp
9. Recarregar página → dados persistem via localStorage ✓
10. Marcar liderado como **Atestado** (período 26/05 → 30/05) → riscado + some da distribuição nos 5 dias
11. Marcar **Day off** com período de 3 dias → bloqueado nos 3 dias, disponível no 4º ✓
12. Marcar **Viagem** com período → idem; ícone ✈️ aparece no badge ✓
13. Marcar **Falta** → só afeta o dia atual; amanhã está disponível ✓
14. Limpar status → liderado volta disponível imediatamente ✓
15. Liderado com ausência ativa aparece no topo da lista em `pageLiderados` com badge colorido ✓

---

## Estrutura do Novo Projeto

```
C:\Users\Dudox\Curso_Python\IAcodes\equipes_new\
├── index.html          ← app coordinator completo (novo arquivo)
├── manifest.json       ← PWA manifest (novo)
├── sw.js               ← Service Worker (novo)
├── icon-192.png        ← ícone PWA 192×192 (usuário fornece)
├── icon-512.png        ← ícone PWA 512×512 (usuário fornece)
└── .git/               ← git init novo e separado
```

### Ações de criação

| Arquivo | Ação |
|---------|------|
| `equipes_new/index.html` | **Criar** — app integrado completo |
| `equipes_new/manifest.json` | **Criar** — com nova paleta e nome do app |
| `equipes_new/sw.js` | **Criar** — cache-first, exclui api.github.com |
| `equipes_new/.git` | **Criar** via `git init` |

> Os ícones (`icon-192.png`, `icon-512.png`) **não são gerados** — o usuário substituirá pelos seus novos ícones.
> O usuário deverá preencher `GH_TOKEN` e `GIST_ID` no início do script de `index.html` após a entrega.

### manifest.json (esboço)
```json
{
  "name": "Equipes",
  "short_name": "Equipes",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#0D0D0D",
  "theme_color": "#0511F2",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}
  ]
}
```

### sw.js (esboço)
```js
const CACHE = 'equipes-new-v1';
const ASSETS = ['./', './index.html'];
// install → cache assets
// fetch → cache-first; bypass para api.github.com e googleapis.com
```

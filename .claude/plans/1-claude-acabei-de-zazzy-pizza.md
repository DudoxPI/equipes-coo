# Plano: Auto-Sync na Abertura do App (stale-while-revalidate)

## Contexto

O app atual só busca dados da nuvem (GitHub Gist) no **primeiro uso** (quando não há dados locais). Depois disso, o usuário precisa clicar manualmente em "Baixar nuvem" para atualizar.

Isso cria um problema real: se o usuário usa o app no PC e depois abre no celular (ou vice-versa), os dados ficam desatualizados sem aviso. A solução é sincronizar automaticamente em background a cada abertura, sem bloquear a tela.

---

## Abordagem: Stale-While-Revalidate

1. **Exibe local imediatamente** — sem nenhum delay para o usuário
2. **Busca nuvem em background** — sem mostrar spinner ou travar a UI
3. **Compara timestamps** (`prog.atualizadoEm`) — só re-renderiza se a nuvem tiver dados mais novos
4. **Falha silenciosa** — se offline ou erro, dot fica vermelho, mas o app continua com local

Isso garante velocidade + dados sempre frescos, sem risco de sobrescrever mudanças locais recentes (já que `salvar()` é fire-and-forget e o timestamp local é sempre atualizado antes de enviar).

---

## Arquivos a modificar

| Arquivo | O que muda |
|---------|-----------|
| `js/sync.js` | Nova função `sincronizarNuvem()` com comparação de timestamp |
| `js/programacao.js` | `init()` chama `sincronizarNuvem()` em background após render local |
| `js/banco.js` | `init()` idem |
| `sw.js` | Bump de versão (v21 → v22) |

---

## Implementação detalhada

### 1. `js/sync.js` — nova função `sincronizarNuvem()`

Adicionar após `forcarDownload()`:

```js
// Sincroniza em background: só atualiza se nuvem for mais recente que local
async function sincronizarNuvem() {
  try {
    syncDot('loading');
    const [b, p] = await Promise.all([lerBin('banco.json'), lerBin('prog.json')]);
    const tsNuvem = p?.atualizadoEm || '';
    const tsLocal = prog.atualizadoEm || '';
    if (tsNuvem > tsLocal) {
      // Nuvem é mais nova: atualiza local e re-renderiza
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
```

### 2. `js/programacao.js` — `init()` com background sync

```js
async function init() {
  carregarLocal();
  if (!temDadosLocal()) {
    // Primeiro uso: aguarda nuvem (sem dados para mostrar)
    await carregarNuvem();
  }
  initSemana();
  renderSemana();
  renderUltimaAtualizacao();
  syncDot('ok');
  // Segundo uso em diante: sync em background sem bloquear
  if (temDadosLocal()) sincronizarNuvem();
}
```

### 3. `js/banco.js` — `init()` com background sync

```js
async function init() {
  carregarLocal();
  if (!temDadosLocal()) await carregarNuvem();
  renderBanco();
  renderUltimaAtualizacao();
  syncDot('ok');
  if (temDadosLocal()) sincronizarNuvem();
}
```

### 4. `sw.js` — bump de versão

```js
const CACHE = 'equipes-coo-v22';
```

---

## O que NÃO muda

- `carregarNuvem()` — continua igual (usado no primeiro uso e no botão "Baixar nuvem")
- `forcarDownload()` — continua igual (botão manual continua funcionando)
- `salvar()` — continua igual (fire and forget, sem alteração)

---

## Verificação

1. Abrir o app → ver dados locais imediatamente (sem delay)
2. Sync dot fica amarelo (loading) brevemente, depois verde
3. Se a nuvem tiver dados mais novos → toast "✓ Dados atualizados!" + tela re-renderiza
4. Desligar Wi-Fi → abrir app → dados locais aparecem, dot fica vermelho (sem crash)
5. Botão "Baixar nuvem" continua funcionando normalmente

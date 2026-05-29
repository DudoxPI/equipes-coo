# Plano: Extensão Chrome — Lazy Tab Loader

## Contexto

O usuário navega com muitas abas abertas, abrindo links em segundo plano (Ctrl+Click) e visitando-os depois. O problema é que o Chrome carrega todas essas abas imediatamente, consumindo memória e banda desnecessariamente.

**Solução:** Uma extensão MV3 que intercepta abas abertas em background e as mantém suspensas (sem carregar nada) até o momento em que o usuário clicar nelas.

**Exceções configuradas pelo usuário:**
- Abas fixadas (pinned) → carregam normalmente
- Extensão pode ser desativada via popup

---

## Arquitetura dos Arquivos

```
_extensao_chrome/
├── manifest.json          ← Configuração MV3
├── background.js          ← Service Worker (lógica central)
├── placeholder.html       ← Página exibida na aba suspensa
├── placeholder.js         ← Lógica da página de suspensão
├── placeholder.css        ← Estilo da página de suspensão
├── popup.html             ← Popup do ícone na barra do Chrome
├── popup.js               ← Lógica do popup
├── popup.css              ← Estilo do popup
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Fluxo Central

```
Usuário Ctrl+Click num link
        ↓
chrome.tabs.onCreated (tab.active = false)
        ↓
  tab.pinned? → SIM → ignora (carrega normal)
        ↓ NÃO
  extensão ativa? → NÃO → ignora
        ↓ SIM
  Pega URL via tab.pendingUrl (disponível neste momento)
        ↓
  Salva { [tab.id]: url } em chrome.storage.session
        ↓
  Redireciona tab para placeholder.html?url=<encoded>
        ↓
  Usuário clica na tab
        ↓
chrome.tabs.onActivated
        ↓
  Tab está em pendingTabs? → SIM → chrome.tabs.update com URL real
        ↓
  Remove da storage.session
        ↓
  Página carrega normalmente
```

---

## Implementação Arquivo a Arquivo

### `manifest.json`
```json
{
  "manifest_version": 3,
  "name": "Lazy Tab Loader",
  "version": "1.0",
  "description": "Suspende abas em segundo plano. Carrega apenas ao focar.",
  "permissions": ["tabs", "storage"],
  "background": { "service_worker": "background.js" },
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
}
```

---

### `background.js` (Service Worker)

**Listeners necessários:**

1. **`chrome.tabs.onCreated`** — intercepta tabs abertas em background
   - Checa: `!tab.active`, `!tab.pinned`, extensão ativa, URL é web válida
   - Salva `pendingTabs[tab.id] = url` em `chrome.storage.session`
   - Redireciona para `placeholder.html?url=<encodedUrl>`

2. **`chrome.tabs.onUpdated`** — fallback para quando `pendingUrl` não está disponível no `onCreated`
   - Se a tab está em estado `"loading"` e tem URL, mas ainda não foi interceptada → aplicar a mesma lógica

3. **`chrome.tabs.onActivated`** — carrega a URL real quando o usuário foca na tab
   - Busca `pendingTabs[tabId]` da `storage.session`
   - Chama `chrome.tabs.update(tabId, { url: realUrl })`
   - Remove da `storage.session`

4. **`chrome.tabs.onRemoved`** — limpeza quando tab é fechada

**Por que `chrome.storage.session` e não uma Map em memória?**
Service Workers no MV3 são efêmeros — podem ser "acordados e dormidos" pelo Chrome. Uma `Map` em memória seria perdida. O `storage.session` persiste durante a sessão do browser mas é limpo ao reiniciar.

---

### `placeholder.html` + `placeholder.js`

**Objetivo:** Mostrar um título identificável na tab suspensa sem carregar nada.

- Lê `?url=` do query string
- `document.title` = hostname da URL (ex: `youtube.com`)
- Exibe visualmente: domínio, indicação de "suspensa", botão "Carregar agora"
- Escuta `visibilitychange` → quando a tab fica visível, mostra spinner (pois o `background.js` vai navegar em instantes)
- Botão "Carregar agora" → `window.location.href = realUrl` (bypass, sem esperar o service worker)

---

### `popup.html` + `popup.js`

**Layout:**
```
┌─────────────────────────────┐
│  ⏸ Lazy Tab Loader          │
│                             │
│  [●──] Ativo                │
│                             │
│  🗂 8 abas suspensas        │
│                             │
│  [ Carregar todas agora ]   │
└─────────────────────────────┘
```

**Funcionalidades:**
- Toggle liga/desliga → salva `{enabled: true/false}` em `chrome.storage.sync`
- Contador lê `pendingTabs` de `chrome.storage.session` e exibe contagem
- Botão "Carregar todas agora" → itera todas as tabs pendentes, restaura URLs, limpa storage

---

## Ícones

Gerar 3 tamanhos (16×16, 48×48, 128×128) com um design simples — ícone de aba com um símbolo de pausa ⏸ ou lua 🌙.  
Pode usar SVG exportado como PNG, ou ferramentas online como favicon.io.

---

## Casos Especiais Tratados

| Situação | Comportamento |
|---|---|
| Aba pinned | Ignora — carrega normalmente |
| Extensão desativada | Ignora — todas as tabs carregam normalmente |
| `pendingUrl` ausente em `onCreated` | `onUpdated` como fallback |
| Tab fechada antes de ser ativada | `onRemoved` limpa a storage.session |
| Usuário abre link na aba atual | `tab.active = true` → não intercepta |
| Protocolo não-HTTP (chrome://, file://, etc.) | Filtro `isWebUrl()` → ignora |

---

## Verificação / Testes

1. **Instalar a extensão:**
   - Abrir `chrome://extensions` → "Carregar sem compactação" → selecionar a pasta do projeto

2. **Teste básico:**
   - Em qualquer site, Ctrl+Click em vários links
   - Verificar que as tabs abertas em background ficam com o placeholder (título = domínio)
   - Verificar que nenhum request de rede é feito nas tabs suspensas (DevTools → Network)
   - Clicar em cada tab → confirmar que carrega normalmente

3. **Teste de exceções:**
   - Fixar uma tab e clicar em links nela → deve carregar normalmente
   - Desativar a extensão pelo popup → todas as tabs devem carregar normalmente

4. **Teste do popup:**
   - Clicar no ícone → verificar toggle e contagem correta de abas suspensas
   - Clicar "Carregar todas agora" → todas as tabs pendentes devem carregar

5. **Teste de borda:**
   - Fechar uma tab suspensa → verificar que não há erros no service worker
   - Reiniciar o Chrome com tabs suspensas abertas → comportamento esperado: storage.session limpa, tabs suspensas ainda apontam para placeholder (que tem o botão "Carregar agora")

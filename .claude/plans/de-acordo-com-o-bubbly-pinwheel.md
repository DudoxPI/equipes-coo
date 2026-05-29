# Plano de Implementação — Sistema de Assinatura Digital (TST)

## Contexto

O time de TST precisa substituir o processo manual de impressão → assinatura em papel → digitalização de documentos de treinamento (NR 35, NR 10, NR 33) por um fluxo 100% digital. O funcionário informa nome e CPF em um computador, escaneia um QR Code com o celular corporativo e assina com o dedo na tela. A assinatura aparece em tempo real no computador e um PDF é gerado e salvo automaticamente.

O projeto está do zero — nenhum arquivo de código existe ainda.

---

## Estrutura de Arquivos Final

```
_sistema_assinatura/
├── manage.py
├── requirements.txt
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── routing.py          ← roteamento WebSocket
├── apps/
│   ├── documents/
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── consumers.py    ← WebSocket consumer
│   │   ├── pdf_generator.py
│   │   ├── qr_utils.py
│   │   └── fixtures/document_types.json
│   └── core/
│       ├── views.py
│       └── urls.py
├── document_contents/
│   ├── nr35.py             ← texto fixo das normas
│   ├── nr10.py
│   └── nr33.py
├── templates/
│   ├── base.html
│   ├── core/home.html
│   ├── documents/
│   │   ├── view_document.html
│   │   ├── signing_screen.html
│   │   ├── mobile_sign.html
│   │   └── log.html
│   └── pdf/document_template.html
├── static/
│   ├── js/
│   │   ├── qrcode.min.js
│   │   ├── signing.js      ← lógica do computador
│   │   └── mobile_canvas.js
│   └── img/logo.png
└── media/
    ├── signatures/
    └── pdfs/
```

---

## Etapa 1 — Ambiente e Projeto Django

**O que fazer:**
- Criar ambiente virtual Python
- Instalar dependências
- Iniciar projeto Django com estrutura `config/` customizada

**`requirements.txt`:**
```
django==4.2.13
channels==4.0.0
daphne==4.0.0
weasyprint==60.2
Pillow==10.3.0
python-decouple==3.8
```

**Configurações críticas em `config/settings.py`:**
- `INSTALLED_APPS`: adicionar `'daphne'` como primeiro, depois `'channels'`, `'apps.documents'`, `'apps.core'`
- `ASGI_APPLICATION = 'config.routing.application'`
- `CHANNEL_LAYERS`: usar `InMemoryChannelLayer` (sem Redis no MVP)
- `TEMPLATES['DIRS']`: apontar para `BASE_DIR / 'templates'`
- `MEDIA_ROOT / MEDIA_URL` para uploads de assinaturas e PDFs
- `STATICFILES_DIRS` para a pasta `static/`

**`config/asgi.py`:** `ProtocolTypeRouter` com HTTP + WebSocket via `URLRouter`

**Critério de conclusão:** `python manage.py runserver` sobe sem erros.

---

## Etapa 2 — Conteúdo dos Documentos

**O que fazer:**
- Criar os arquivos `document_contents/nr35.py`, `nr10.py`, `nr33.py`
- Cada arquivo exporta: `TITULO`, `CORPO`, `RODAPE` (strings)
- O texto das normas é fixo — não vai para o banco de dados

**Critério de conclusão:** `python manage.py check` retorna zero erros.

---

## Etapa 3 — Models

**Arquivo:** `apps/documents/models.py`

Três models:

**`DocumentType`** — tipos de documento (NR 35, NR 10, NR 33)
- `slug` (unique) — chave de referência para os módulos de conteúdo
- `name`, `is_active`, `created_at`

**`SignatureSession`** — sessão ativa de assinatura
- `session_token` (UUID, unique) — identificador da sessão no WebSocket e QR
- `document_type` (FK), `employee_name`, `employee_cpf`
- `status`: `waiting_scan` → `waiting_signature` → `signature_received` → `completed` / `cancelled` / `expired`
- `signature_image` (ImageField), `pdf_file` (FileField)
- `created_at`, `signed_at`, `expires_at` (= created_at + 2 min)
- Método `is_expired()` → `timezone.now() > self.expires_at`

**`SignatureLog`** — registro imutável de cada assinatura concluída
- `document_type`, `employee_name`, `employee_cpf`, `signed_at`
- `pdf_file`, `session_token` (para rastreabilidade)
- `Meta: ordering = ['-signed_at']`

**Fixture:** `apps/documents/fixtures/document_types.json` com os 3 tipos de documento. Carregar com `python manage.py loaddata document_types`.

**Critério de conclusão:** `makemigrations` + `migrate` + `loaddata` sem erros. Os 3 `DocumentType` aparecem no admin.

---

## Etapa 4 — WebSocket (Django Channels)

**Arquivo:** `config/routing.py`
```python
websocket_urlpatterns = [
    re_path(r'ws/signature/(?P<session_token>[0-9a-f-]+)/$',
            consumers.SignatureConsumer.as_asgi()),
]
```

**Arquivo:** `apps/documents/consumers.py` — `SignatureConsumer(AsyncWebsocketConsumer)`

O consumer gerencia um grupo por `session_token`. Dois clientes se conectam ao mesmo grupo: o computador e o celular.

Mensagens recebidas via `receive()`:
- `mobile_connected` → retransmite para o grupo (computador atualiza estado)
- `signature_data` → salva imagem base64 como arquivo; retransmite `signature_received` com a imagem
- `action` (accept/redo/cancel) → atualiza banco; retransmite `action_taken`

Métodos assíncronos usando `@database_sync_to_async`:
- `get_session()` — valida token e expiração no connect
- `save_signature(image_base64)` — decodifica base64, salva como PNG em `media/signatures/`
- `handle_action(action)` — atualiza status da sessão

**Critério de conclusão:** Dois navegadores conectados ao mesmo grupo trocam mensagens em tempo real.

---

## Etapa 5 — Views e URLs

**`config/urls.py`:** inclui `apps.core.urls` (raiz) e `apps.documents.urls` (prefix `documents/`). Serve `MEDIA_URL` em desenvolvimento.

**`apps/documents/urls.py`** — URLs principais:
| Nome | Path | Método | Descrição |
|------|------|--------|-----------|
| `view_document` | `<slug>/view/` | GET | Documento em modo leitura |
| `start_session` | `<slug>/start-session/` | POST | Cria sessão, redireciona para signing_screen |
| `signing_screen` | `session/<uuid>/` | GET | Tela do computador com QR Code |
| `renew_session` | `session/<uuid>/renew/` | POST | Renova sessão expirada, retorna JSON |
| `mobile_sign` | `mobile/<uuid>/` | GET | Página do celular com canvas |
| `accept_signature` | `session/<uuid>/accept/` | POST | Gera PDF, cria log, retorna JSON |
| `cancel_session` | `session/<uuid>/cancel/` | POST | Cancela sessão |
| `signature_log` | `log/` | GET | Lista SignatureLogs com filtros |

**`apps/core/views.py`:** `HomeView` (ListView) retorna `DocumentType.objects.filter(is_active=True)` + últimas 10 entradas do log.

**Critério de conclusão:** `GET /` e `GET /documents/log/` retornam 200. Todas as URLs resolvem sem `NoReverseMatch`.

---

## Etapa 6 — Templates HTML

**`templates/base.html`:** Tailwind CSS + DaisyUI via CDN (sem build step). Navbar com logo, título e link para o log.

**`templates/core/home.html`:**
- Cards por documento (ícone, nome, dois botões: Visualizar / Assinar)
- Modal DaisyUI único para assinatura — o slug do documento é injetado via JS ao clicar
- Formulário no modal: Nome completo + CPF (com máscara `000.000.000-00`)
- Tabela das últimas 10 assinaturas (log resumido)

**`templates/documents/signing_screen.html`:**
- Layout em duas colunas: preview do documento (70%) + painel de status (30%)
- Área de assinatura muda de estado via JS:
  - Estado 1: div `#qrcode-container` + contador regressivo
  - Estado 2: "Celular conectado, aguardando assinatura..."
  - Estado 3: imagem da assinatura + botões Cancelar / Refazer / Aceitar
- Variáveis Django passadas ao JS: `session_token`, `employee_name`, `employee_cpf`, `expires_at`

**`templates/documents/mobile_sign.html`:**
- `<meta name="viewport" content="..., user-scalable=no">` para evitar zoom acidental
- Cabeçalho com nome do documento e dados do funcionário (confirmação de identidade)
- `<canvas id="signature-canvas">` — ocupa toda a largura
- Botões: Limpar / Enviar Assinatura
- Elemento `<input id="session-token" type="hidden" value="{{ session.session_token }}">` para o JS

**`templates/pdf/document_template.html`:** CSS inline para WeasyPrint. `@page { size: A4; margin: 2cm; }`. Usa `file:///` URIs para logo e assinatura.

**Critério de conclusão:** Home exibe 3 cards. Modal abre e fecha. Página mobile é responsiva em 375px.

---

## Etapa 7 — QR Code e Contador Regressivo

**`static/js/qrcode.min.js`** — baixar de `cdn.jsdelivr.net/gh/davidshimjs/qrcodejs/qrcode.min.js`

**`static/js/signing.js`** — lógica do computador:
1. `initQRCode()` — gera QR Code com `qrcode.js` apontando para a URL mobile absoluta
2. `startCountdown()` — decrementa `expires_at - now()` a cada segundo; chama `renewSession()` ao zerar
3. `renewSession()` — POST para `/renew/`, redireciona com o novo token retornado em JSON
4. WebSocket — inicializa e gerencia os 3 estados da interface
5. Handlers dos botões Aceitar (POST `/accept/`), Refazer (WS `action:redo`), Cancelar (POST `/cancel/`)

**`apps/documents/qr_utils.py`:**
```python
def get_mobile_url(request, session_token):
    path = reverse('mobile_sign', kwargs={'session_token': str(session_token)})
    return request.build_absolute_uri(path)
    # Retorna http://192.168.x.x:8000/... quando servidor usa IP da rede
```

**Ponto crítico de rede:** o servidor deve ser iniciado com o IP da máquina para que o QR Code seja acessível pelo celular:
```
daphne config.asgi:application -b 192.168.x.x -p 8000
```

**Critério de conclusão:** QR Code aparece em < 1 segundo. Escanear com o celular abre a página mobile. Após 2 min, nova sessão é criada automaticamente.

---

## Etapa 8 — Canvas no Celular e Transmissão

**`static/js/mobile_canvas.js`:**
- `resizeCanvas()` — ajusta resolução para telas HDPI (multiplicar por `devicePixelRatio`)
- Listeners de `touchstart`/`touchmove`/`touchend` com `e.preventDefault()` (evita scroll)
- Suporte a `mousedown`/`mousemove`/`mouseup` para testes no desktop
- `ws.onopen` → envia `{type: 'mobile_connected'}`
- `ws.onmessage` → trata `action_taken: redo` (limpa canvas) e `action_taken: accept` (desabilita botão)
- Botão "Enviar" → `canvas.toDataURL('image/png')` → WS `{type: 'signature_data', image: ...}`
- Validação: canvas vazio não permite envio

**Completar `consumers.py`:**
- `save_signature()` — decodifica `data:image/png;base64,...`, salva com `ContentFile`, atualiza `status = 'signature_received'`
- `handle_action('redo')` — deleta arquivo de assinatura, status volta para `'waiting_signature'`
- `handle_action('cancel')` — status = `'cancelled'`
- `handle_action('accept')` — status = `'completed'`, registra `signed_at`

**Critério de conclusão:** Assinatura desenhada no celular aparece no computador em < 1 segundo. Refazer limpa o canvas no celular.

---

## Etapa 9 — Geração de PDF com WeasyPrint

**`apps/documents/pdf_generator.py`:**

```python
def get_document_content(slug):
    module = importlib.import_module(f'document_contents.{slug}')
    return {'titulo': module.TITULO, 'corpo': module.CORPO, 'rodape': module.RODAPE}

def generate_pdf(session):
    # Monta contexto com dados do documento + dados do funcionário
    # Usa file:/// URIs para logo e imagem de assinatura
    # render_to_string('pdf/document_template.html', context) → HTML string
    # HTML(string=...).write_pdf() → bytes
    # session.pdf_file.save(filename, ContentFile(pdf_bytes))
    return session.pdf_file.url
```

**`AcceptSignatureView` (completar em `views.py`):**
1. Atualiza `session.status = 'completed'` e `session.signed_at`
2. Chama `generate_pdf(session)`
3. Cria `SignatureLog` com todos os dados
4. Notifica celular via `channel_layer.group_send()` com `action_taken: accept`
5. Retorna `JsonResponse({'pdf_url': ..., 'status': 'completed'})`

**Ponto crítico no Windows:** WeasyPrint requer GTK3. Instalar `gtk3-runtime` para Windows e adicionar `bin/` ao PATH. Alternativa: usar WSL2.

**Critério de conclusão:** Clicar Aceitar gera arquivo em `media/pdfs/`. PDF contém logo, cabeçalho, texto da norma, nome, CPF, data e imagem da assinatura.

---

## Etapa 10 — Tela de Log

**`SignatureLogView`** (ListView com `paginate_by=20`):
- Filtros GET: `?doc_type=nr35` e `?date_from=2024-01-01`
- `select_related('document_type')` para evitar N+1

**`templates/documents/log.html`:**
- Formulário de filtros
- Tabela: Data/Hora | Documento (badge colorido) | Funcionário | CPF | [Baixar PDF]
- Paginação DaisyUI

**Critério de conclusão:** Log exibe assinaturas com todos os dados. Link de download abre o PDF correto.

---

## Sequência de Implementação

```
Etapa 1 (Ambiente)
  └── Etapa 2 (Conteúdo das normas)
        └── Etapa 3 (Models + migrations + fixtures)
              ├── Etapa 4 (WebSocket consumer)     ┐ podem ser feitas
              └── Etapa 5 (Views e URLs)           ┘ em paralelo
                    └── Etapa 6 (Templates)
                          ├── Etapa 7 (QR Code + countdown)
                          │     └── Etapa 8 (Canvas + WS completo)
                          │           └── Etapa 9 (PDF)
                          │                 └── Etapa 10 (Log)
                          └── (log pode ser feito em paralelo com etapas 7-8)
```

---

## Teste de Fluxo Completo (End-to-End)

```
[ ] Home exibe 3 cards de documentos
[ ] Modal abre ao clicar "Assinar" → preencher Nome e CPF
[ ] Tela de assinatura exibe QR Code com contador regressivo
[ ] Celular escaneia QR → página mobile abre (confirma nome e documento)
[ ] Computador: status muda para "Celular conectado"
[ ] Celular: assinar com o dedo → clicar Enviar
[ ] Computador: assinatura aparece no documento
[ ] Clicar Aceitar → PDF gerado em media/pdfs/
[ ] Log exibe a entrada com data, hora, documento, nome e link para PDF
[ ] Fluxo completo < 90 segundos
[ ] Clicar Refazer → canvas do celular é limpo → nova assinatura possível
[ ] Contador expira → nova sessão criada → novo QR aparece automaticamente
```

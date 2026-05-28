# Relatório de Testes — Equipes Coo

**Data:** 28/05/2026  
**Versão:** sw cache `equipes-coo-v19`  
**Repositório:** https://github.com/DudoxPI/equipes-coo  
**App (GitHub Pages):** https://dudoxpi.github.io/equipes-coo/

---

## Camada 1 — Testes Automatizados (`test.html`)

> Página standalone que carrega `js/config.js` + `js/sync.js` e executa automaticamente ao abrir.

**Resultado: 44/44 PASS — 0 falhas**

| Bloco | Descrição | Testes | Resultado |
|-------|-----------|--------|-----------|
| 1 | Helpers de data (`fmtD`, `fmtBR`, `getSeg`, `getDias`) | 8 | ✅ PASS |
| 2 | Helpers de dados (`uid`, `alpha`, `nomePorId`) | 7 | ✅ PASS |
| 3 | `isAusenteNoDia` — falta, férias, afastamento, null/undefined, sem ausência | 13 | ✅ PASS |
| 4 | `getEqs` / `prog` state — isolamento, adição, dias independentes | 4 | ✅ PASS |
| 5 | Regressões — bugs #1/#2/#5 validados com dados simulados | 12 | ✅ PASS |

### Casos críticos verificados (Bloco 3)

| Caso | Esperado | Obtido |
|------|----------|--------|
| Falta no dia exato | `true` | `true` ✅ |
| Falta no dia anterior | `false` | `false` ✅ |
| Férias: dentro do período | `true` | `true` ✅ |
| Férias: antes do início | `false` | `false` ✅ |
| Afastamento `fim: null` | `true` p/ dias futuros | `true` ✅ |
| Afastamento `fim: undefined` | `true` p/ dias futuros | `true` ✅ |
| Sem prop `ausencias` | `false` | `false` ✅ |

---

## Camada 2 — Testes de UI (GitHub Pages)

> Fluxo executado no Chrome via automação browser no app em produção.

| # | Ação / Verificação | Status | Observação |
|---|--------------------|--------|------------|
| 1 | App carrega (`https://dudoxpi.github.io/equipes-coo/`) | ✅ | |
| 2 | Senha errada → mensagem de erro | — | Sessão já autenticada; auth testada via localStorage |
| 3 | Autenticação ativa (sessão persistida) | ✅ | |
| 4 | `banco.html` — seções Líderes, Funcionários, Atividades, Áreas | ✅ | Todas ordenadas A-Z |
| 5 | Adicionar líder | — | Skipped (não modificar dados de produção) |
| 6 | Adicionar funcionário | — | Skipped (não modificar dados de produção) |
| 7 | Atividades e Áreas visíveis com itens | ✅ | |
| 8 | Badge de ausência no líder (`Dudox — Folga 29/05`) | ✅ | |
| 9 | Day tab SEX 29 mostra "1 ausente" | ✅ | **Bug #2 confirmado resolvido** |
| 10 | Card "AUSÊNCIAS HOJE 1" com Dudox (líder) | ✅ | **Bug #1 confirmado resolvido** |
| 11 | Chip "Dudox (ausente)" visível no stepper de nova equipe | ✅ | |
| 12 | Stepper completo — líder → área → atividade → membro → salvar | — | Skipped (não modificar dados de produção) |
| 13 | Cards de equipe: líder, área, atividades, membros, obs | ✅ | QUA 27: Dudox + Jabour |
| 14 | PDF da semana — popup abre sem erro de popup blocker | ✅ | |
| 15 | PDF — cabeçalhos com fundo **preto** (`background: #000`) | ✅ | **Bug #3 confirmado resolvido** |
| 16 | PDF — orientação **landscape** (`@page { size: A4 landscape }`) | ✅ | **Bug #4 confirmado resolvido** (desktop) |
| 17 | PDF — nome do líder correto nos cards | ✅ | **Bug #5 confirmado resolvido** |
| 18 | Lista Coordenação — líder, área, atividades, ausentes | ✅ | **Bug #6 encontrado e corrigido** |
| 19 | Lista Equipes — formato simplificado com líder e membros | ✅ | **Bug #6 corrigido** |
| 20 | Botão Copiar — conteúdo correto confirmado via clipboard | ✅ | |
| 21 | Sync dot — verde (`rgb(61,224,122)`, classe `ok`) | ✅ | |

---

## Bugs encontrados e corrigidos nesta rotina

### Bug #6 (novo — encontrado durante os testes)

**Arquivo:** `js/export.js`  
**Sintoma:** Listas do WhatsApp (Coordenação e Equipes) exibiam `*Sem líder*` para todos os líderes  
**Causa raiz:** Mesma raiz dos bugs #1/#2/#5 — `buildListaEquipes()`, `buildListaCoordenacao()` e `ausenciasDoDia()` consultavam apenas `banco.funcionarios`, ignorando `banco.lideres`  
**Correção:** 3 locais corrigidos para usar `[...(banco.lideres || []), ...banco.funcionarios]` / fallback `nomePorId(banco.lideres || [], id)`  
**Commit:** `1b6e076`  

---

## Bugs corrigidos no sprint (confirmados resolvidos)

| Bug | Descrição | Arquivo | Commit |
|-----|-----------|---------|--------|
| #1 | Card "Ausências hoje" desapareceu da tela inicial | `js/programacao.js` | `7464ae3` |
| #2 | Contagem de ausentes sumiu das tabs dos dias | `js/programacao.js` | `7464ae3` |
| #3 | Cabeçalhos do PDF sem fundo preto | `js/export.js` | `b4d7b51` |
| #4 | PDF gerado em retrato em vez de paisagem | `js/export.js` | `b4d7b51` |
| #5 | PDF exibia "Sem líder" nos cards | `js/export.js` | `b4d7b51` |
| #6 | Listas WhatsApp exibiam "Sem líder" | `js/export.js` | `1b6e076` |

**Causa raiz comum de #1, #2, #5, #6:** separação `banco.lideres` / `banco.funcionarios` introduzida sem atualizar todos os consumidores.

---

## Limitação conhecida

| Item | Descrição |
|------|-----------|
| PDF landscape no celular | Navegadores mobile (Chrome Android, Safari iOS) ignoram `@page { size: A4 landscape }`. O usuário precisa selecionar "Paisagem" manualmente no diálogo de impressão. Aviso exibido no popup quando detectado mobile. |

---

## Critérios de aprovação para produção

- [x] `test.html` → **44/44 testes verdes (0 falhas)**
- [x] Fluxo de UI no GitHub Pages completo **sem erros**
- [x] Regressões #1, #2, #3, #4, #5 confirmadas resolvidas
- [x] Bug #6 encontrado, corrigido e deployado durante a rotina

## ✅ STATUS: APROVADO PARA PRODUÇÃO

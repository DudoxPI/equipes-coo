# Equipes Coo — Instruções para Claude

## Arquitetura do projeto

| Arquivo | Responsabilidade |
|---------|-----------------|
| `js/sync.js` | Estado global (`banco`, `prog`), helpers, localStorage, Gist (nuvem) |
| `js/programacao.js` | Tela principal: semana, day tabs, cards de ausentes/disponíveis, form de equipe |
| `js/banco.js` | CRUD de líderes, funcionários, atividades, áreas e ausências |
| `js/export.js` | Geração do PDF (HTML gerado + window.print) e listas para WhatsApp |
| `js/config.js` | Constantes (DN, GIST_ID, GH_TOKEN, etc.) |
| `css/components.css` | Todo o CSS de componentes (dtabs, cards, modais, aus-card, etc.) |
| `index.html` | Tela principal |
| `banco.html` | Tela do banco de dados |

## Dados compartilhados críticos

- `banco.lideres[]` — líderes (têm `ausencias[]`)
- `banco.funcionarios[]` — funcionários (têm `ausencias[]`)
- `banco.areas[]`, `banco.atividades[]`
- `prog.dias[YYYY-MM-DD].equipes[]` — programação da semana

**⚠️ Qualquer mudança em `banco` ou `prog` afeta AMBAS as telas + o export.**

## Regra obrigatória antes de toda implementação

Antes de editar qualquer arquivo, liste explicitamente:

1. **O que muda**: qual função/variável/CSS será alterado
2. **Quem usa isso**: todos os arquivos/funções que consomem esse dado ou componente
3. **Efeito colateral potencial**: o que pode quebrar em cada tela (index, banco, export/PDF)
4. **Teste de regressão mínimo**: o que verificar após a mudança

Seja crítico e pessimista: assuma que qualquer mudança em `sync.js` quebra tudo, e qualquer mudança em `banco.js` afeta o que é exibido em `programacao.js` e no PDF.

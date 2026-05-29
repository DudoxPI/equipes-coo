# Plano: Publicar no GitHub Pages + instalar como PWA

## Context
O projeto já é um PWA completo (manifest.json, sw.js, meta tags). O repositório é local sem remote. Para abrir online e instalar como PWA, o fluxo é: criar repo no GitHub → fazer push → ativar GitHub Pages → acessar a URL.

**⚠️ Ponto crítico:** `js/config.js` contém um `GH_TOKEN` (Personal Access Token do GitHub). Se o repo for **público**, o GitHub detecta e revoga o token automaticamente — e a sincronização com o Gist para de funcionar. Solução: manter o repositório **privado**.

---

## Passo a passo

### 1 — Criar repositório privado no GitHub *(manual — navegador)*
- Acessar [github.com/new](https://github.com/new)
- Nome sugerido: `equipes-coo`
- Marcar **Private** ← obrigatório para proteger o token
- **NÃO** marcar "Initialize with README"
- Clicar **Create repository**

### 2 — Conectar e enviar o código *(terminal no projeto)*
```powershell
git remote add origin https://github.com/DudoxPI/equipes-coo.git
git push -u origin main
```
> Substituir `DudoxPI/equipes-coo` pelo nome exato do repo criado.

### 3 — Ativar GitHub Pages *(manual — navegador)*
- No repo criado → aba **Settings** → seção **Pages** (menu lateral)
- **Source:** Deploy from a branch
- **Branch:** `main` / `/ (root)`
- Clicar **Save**
- Aguardar ~1 min; a URL aparece no topo da seção Pages:  
  `https://DudoxPI.github.io/equipes-coo/`

> **Nota:** GitHub Pages em repo **privado** requer conta **GitHub Pro** (USD 4/mês).  
> Alternativa gratuita: usar **Netlify** (ver abaixo).

### Alternativa gratuita — Netlify (repo privado, site público)
Caso não queira pagar o GitHub Pro:
1. Acessar [netlify.com](https://netlify.com) → Login com GitHub
2. **Add new site → Import an existing project → GitHub**
3. Selecionar o repo `equipes-coo`
4. Build command: *(deixar vazio)* / Publish directory: `.` (ponto)
5. **Deploy** → URL gerada automaticamente (ex: `https://equipes-coo.netlify.app`)

---

### 4 — Instalar o PWA
No celular, acessar a URL gerada:
- **Android (Chrome):** banner "Adicionar à tela inicial" aparece automaticamente, ou Menu → "Instalar app"
- **iPhone (Safari):** botão Compartilhar → "Adicionar à Tela de Início"

---

## Arquivos alterados
Nenhum. Apenas configuração externa (GitHub + GitHub Pages/Netlify).

## Verificação
1. Acessar a URL → app carrega normalmente
2. Dados sincronizam via Gist (confirmar que o token não foi revogado)
3. PWA aparece para instalação no celular

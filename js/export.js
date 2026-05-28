/* ═══════════════════════════════════════
   EXPORT — geração de listas para WhatsApp
   ═══════════════════════════════════════ */

// Helper: formata data do diaAtual como DD/MM/YYYY
function dataBR() {
  const [y, m, d] = diaAtual.split('-');
  return `${d}/${m}/${y}`;
}

// Helper: agrupa ausentes do dia por tipo (mesma lógica do card)
function ausenciasDoDia() {
  const ORDEM = ['ferias', 'viagem', 'folga', 'dayoff', 'atestado', 'falta', 'afastamento'];
  const grupos = {};
  [...(banco.lideres || []), ...banco.funcionarios]
    .filter(f => isAusenteNoDia(f, diaAtual))
    .forEach(f => {
      const aus = (f.ausencias || []).find(a => {
        if (diaAtual < a.inicio) return false;
        return a.fim === null || a.fim === undefined || diaAtual <= a.fim;
      });
      const tipo = aus ? aus.tipo : 'falta';
      if (!grupos[tipo]) grupos[tipo] = [];
      grupos[tipo].push({ f, aus });
    });
  return { grupos, ORDEM };
}

function buildListaEquipes() {
  const eqs = getEqs(diaAtual);
  if (!eqs.length) return 'Nenhuma equipe programada para este dia.';
  let txt = `📋 *Distribuição do dia ${dataBR()}*\n\n`;
  eqs.forEach(eq => {
    const lider = nomePorId(banco.lideres || [], eq.lider) || nomePorId(banco.funcionarios, eq.lider) || 'Sem líder';
    const membs = (eq.membros || []).map(mid => nomePorId(banco.funcionarios, mid)).filter(Boolean);
    txt += `👤 *${lider}*\n`;
    membs.forEach(mb => { txt += `  • ${mb}\n`; });
    txt += '\n';
  });
  return txt.trim();
}

function buildListaCoordenacao() {
  const eqs  = getEqs(diaAtual);
  let txt    = `📋 *Distribuição do dia ${dataBR()}*\n\n`;
  let temConteudo = false;

  eqs.forEach(eq => {
    const lider = nomePorId(banco.lideres || [], eq.lider) || nomePorId(banco.funcionarios, eq.lider) || 'Sem líder';
    const area  = nomePorId(banco.areas, eq.area);
    const ativs = (eq.atividades || []).map(aid => nomePorId(banco.atividades, aid)).filter(Boolean);
    const membs = (eq.membros    || []).map(mid => nomePorId(banco.funcionarios, mid)).filter(Boolean);
    txt += `👤 *${lider}*\n`;
    if (area)  txt += `  🏠 ${area}\n`;
    ativs.forEach(a  => { txt += `  🎯 ${a}\n`; });
    membs.forEach(mb => { txt += `  • ${mb}\n`; });
    if (eq.obs) txt += `  📝 ${eq.obs}\n`;
    txt += '\n';
    temConteudo = true;
  });

  // Ausentes do dia agrupados por tipo
  const { grupos, ORDEM } = ausenciasDoDia();
  const tiposComDados = ORDEM.filter(t => grupos[t]);
  if (tiposComDados.length) {
    if (temConteudo) txt += '\n';
    tiposComDados.forEach(t => {
      txt += `${TIPO_EMOJI[t]} *${TIPO_LABEL[t]}*\n`;
      grupos[t].forEach(({ f, aus }) => {
        let linha = `  • ${f.nome}`;
        if (aus && aus.fim && aus.fim !== aus.inicio) linha += ` (retorno ${fmtBR(aus.fim)})`;
        txt += linha + '\n';
      });
    });
    temConteudo = true;
  }

  return temConteudo
    ? txt.trim()
    : `📋 *Distribuição do dia ${dataBR()}*\n\n(Nenhuma equipe programada)`;
}

// ── Exportar semana inteira em PDF (A4 landscape, P&B, escala dinâmica) ──
function exportarSemanaPDF() {
  const dias      = getDias(semAtual);
  const semTitulo = fmtBR(dias[0]) + ' — ' + fmtBR(dias[4]);

  // Máximo de equipes entre os 5 dias → define a escala
  const maxEqs = Math.max(...dias.map(d => getEqs(d).length), 1);

  // Escala dinâmica: 3 tiers
  //   ≤ 3 equipes → fontes maiores / mais respiro
  //   4–5         → médio
  //   6–7         → compacto (limite da página)
  let fsLider, fsInfo, fsTiny, fsHdr, padHdr, padBody, padCard, gapCard, gapCol, mbTitulo;
  if (maxEqs <= 3) {
    fsLider = 12.5; fsInfo = 10.5; fsTiny = 9;   fsHdr = 10;
    padHdr  = '9px 11px'; padBody = '8px 9px'; padCard = '9px 10px';
    gapCard = 8; gapCol = 7; mbTitulo = 9;
  } else if (maxEqs <= 5) {
    fsLider = 10.5; fsInfo = 9;    fsTiny = 8;   fsHdr = 9;
    padHdr  = '7px 9px';  padBody = '6px 7px';  padCard = '7px 8px';
    gapCard = 6; gapCol = 6; mbTitulo = 7;
  } else {
    // 6–7 equipes — compacto máximo
    fsLider = 9;    fsInfo = 8;    fsTiny = 7;   fsHdr = 8;
    padHdr  = '5px 7px';  padBody = '5px 5px';  padCard = '5px 6px';
    gapCard = 4; gapCol = 5; mbTitulo = 6;
  }

  // Constrói cada coluna
  const colunas = dias.map((d, i) => {
    const eqs = getEqs(d);
    const dn  = ['SEG', 'TER', 'QUA', 'QUI', 'SEX'][i];
    const [, mm, dd] = d.split('-');
    const dataFmt    = dd + '/' + mm;
    const qtdLabel   = eqs.length
      ? `${eqs.length} equipe${eqs.length > 1 ? 's' : ''}`
      : 'sem prog.';
    // Título da coluna em linha: "26/05 - TER - 5 equipes"
    const hdrTitle = `${dn} - ${dataFmt} - ${qtdLabel}`;

    if (!eqs.length) {
      return `<div class="col">
        <div class="col-hdr"><span class="col-title">${hdrTitle}</span></div>
        <div class="col-body"><div class="sem-prog">Sem programação</div></div>
      </div>`;
    }

    const cardsHtml = eqs.map((eq, idx) => {
      const lider = nomePorId(banco.lideres || [], eq.lider) || nomePorId(banco.funcionarios, eq.lider) || 'Sem líder';
      const area  = nomePorId(banco.areas, eq.area);
      const ativs = (eq.atividades || []).map(aid => nomePorId(banco.atividades, aid)).filter(Boolean);
      const membs = (eq.membros    || []).map(mid => nomePorId(banco.funcionarios, mid)).filter(Boolean);

      // Área + atividades na mesma linha
      const areaEl = area  ? `<span class="card-area">${area}</span>` : '';
      const ativEl = ativs.map(a => `<span class="card-ativ">${a}</span>`).join('');
      const infoLn = (area || ativs.length)
        ? `<div class="card-info">${areaEl}${ativEl}</div>` : '';

      const membsLn = membs.length
        ? `<div class="card-membs">${membs.join(' - ')}</div>` : '';
      const obsLn = eq.obs
        ? `<div class="card-obs">${eq.obs}</div>` : '';

      return `<div class="card">
        <div class="card-top">
          <span class="card-lider">${lider}</span>
          <span class="card-num">Eq. ${idx + 1}</span>
        </div>
        ${infoLn}${membsLn}${obsLn}
      </div>`;
    }).join('');

    return `<div class="col">
      <div class="col-hdr"><span class="col-title">${hdrTitle}</span></div>
      <div class="col-body">${cardsHtml}</div>
    </div>`;
  }).join('');

  const agora = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

  const htmlPDF = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Programação ${semTitulo}</title>
<style>
  @page { size: A4 landscape; margin: 6mm 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0;
      -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #000; background: #fff; }

  /* Cabeçalho da página */
  .cabecalho { display: flex; align-items: baseline; justify-content: space-between;
               border-bottom: 1.5px solid #000; padding-bottom: 5px;
               margin-bottom: ${mbTitulo}px; }
  .titulo    { font-size: ${fsLider}px; font-weight: 800; color: #000; letter-spacing: -.2px; }
  .gerado    { font-size: ${fsTiny}px; color: #666; }

  /* Grade 5 colunas */
  .grade { display: grid; grid-template-columns: repeat(5, 1fr);
           gap: ${gapCol}px; align-items: start; }

  /* Cabeçalho da coluna — linha única */
  .col-hdr   { background: #000; color: #fff; border-radius: 4px 4px 0 0;
               padding: ${padHdr}; }
  .col-title { font-size: ${fsHdr}px; font-weight: 700; display: block;
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Corpo da coluna */
  .col-body { border: 1px solid #ccc; border-top: none; border-radius: 0 0 4px 4px;
              padding: ${padBody}; }

  /* Cards */
  .card { border: 1px solid #ddd; border-radius: 3px; padding: ${padCard};
          margin-bottom: ${gapCard}px; page-break-inside: avoid;
          border-left: 2.5px solid #000; }
  .card:last-of-type { margin-bottom: 0; }

  .card-top   { display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 3px; }
  .card-lider { font-weight: 700; font-size: ${fsLider}px; color: #000; }
  .card-num   { font-size: ${fsTiny}px; color: #666; font-weight: 700;
                border: 1px solid #ccc; padding: 0 5px; border-radius: 8px;
                white-space: nowrap; flex-shrink: 0; }

  /* Área + atividades em linha */
  .card-info  { display: flex; flex-wrap: wrap; align-items: center;
                gap: 3px; margin-bottom: 2px; }
  .card-area  { font-size: ${fsInfo}px; font-weight: 700; color: #000;
                border: 1px solid #888; padding: 0 5px; border-radius: 8px; }
  .card-ativ  { font-size: ${fsInfo}px; color: #333; font-style: italic; font-weight: 700; }
  .card-ativ:not(:first-of-type)::before { content: '·'; margin-right: 3px; color: #aaa; }

  .card-membs { font-size: ${fsInfo}px; color: #222; line-height: 1.45; }
  .card-obs   { font-size: ${fsTiny}px; color: #555; margin-top: 3px; padding-top: 3px;
                border-top: 1px dashed #ddd; font-style: italic; }

  .sem-prog { text-align: center; color: #bbb; padding: 10px 4px;
              font-size: ${fsInfo}px; font-style: italic; }
  .rodape   { margin-top: 6px; text-align: right; font-size: ${fsTiny}px; color: #bbb; }
</style>
</head>
<body>
  <div class="cabecalho">
    <span class="titulo">Programação — ${semTitulo}</span>
    <span class="gerado">Gerado em ${agora} · APP Coordenador</span>
  </div>
  <div class="grade">${colunas}</div>
  <div class="rodape">Equipes Coo</div>
  <script>window.onload = () => { window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1000,height=700');
  if (!win) { toast('⚠️ Permita popups para exportar PDF'); return; }
  win.document.write(htmlPDF);
  win.document.close();
}

function openListaModal(tipo) {
  const txt = tipo === 'coordenacao' ? buildListaCoordenacao() : buildListaEquipes();
  document.getElementById('listaTexto').textContent      = txt;
  document.getElementById('modalListaTitulo').textContent = tipo === 'coordenacao' ? 'Coordenação 📋' : 'Equipes 👥';
  document.getElementById('modalLista').classList.add('open');
}

function copiarLista() {
  const txt = document.getElementById('listaTexto').textContent;
  try {
    const area = document.createElement('textarea');
    area.value = txt;
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(area);
    area.focus();
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    toast('✓ Copiado!');
  } catch {
    toast('Erro ao copiar');
  }
}

function closeListaModal() {
  document.getElementById('modalLista').classList.remove('open');
}

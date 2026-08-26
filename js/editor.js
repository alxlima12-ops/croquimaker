/* ============================================================
   editor.js
   Núcleo do editor de croquis: estado, desenho, interação,
   importação e exportação.

   O croqui inteiro é um único SVG com viewBox fixo em A4
   paisagem (1123 x 794 px a 96 dpi). Tudo que aparece na tela
   mas não deve sair na exportação leva a classe .so-tela.
   ============================================================ */

(function () {
  'use strict';

  /* Formatos de folha, em milímetros. O tamanho em px vem daí a 96 dpi,
     que é a unidade do viewBox — 297 mm dão exatamente 1123 px. */
  const FORMATOS = [
    { id: 'a4-paisagem', nome: 'A4 paisagem', l: 297, a: 210 },
    { id: 'a4-retrato',  nome: 'A4 retrato',  l: 210, a: 297 },
    { id: 'a3-paisagem', nome: 'A3 paisagem', l: 420, a: 297 },
    { id: 'a3-retrato',  nome: 'A3 retrato',  l: 297, a: 420 },
    { id: 'a2-paisagem', nome: 'A2 paisagem', l: 594, a: 420 },
    { id: 'a2-retrato',  nome: 'A2 retrato',  l: 420, a: 594 },
    { id: 'carta-paisagem', nome: 'Carta paisagem', l: 279, a: 216 },
    { id: 'carta-retrato',  nome: 'Carta retrato',  l: 216, a: 279 },
    { id: 'personalizado', nome: 'Personalizado', l: 297, a: 210 }
  ];

  const PX_POR_MM = 96 / 25.4;
  const mmParaPx = mm => Math.round(mm * PX_POR_MM);

  let LARGURA = 1123, ALTURA = 794;

  /* ---------------- Estado ---------------- */

  const vazio = () => ({
    meta: {
      titulo: 'Croqui sem título',
      croquista: '',
      abertura: '',
      equipe: [],
      nota: ''
    },
    ficha: {},
    itens: [],
    folha: { formato: 'a4-paisagem', larguraMm: 297, alturaMm: 210 },
    calque: null   // só na sessão; não vai para o .json
  });

  let estado = vazio();
  let sel = null;          // id do item selecionado
  let zoom = 1;
  let seq = 1;             // gerador de ids

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = $('#croqui');
  const camItens = $('#camada-itens');
  const camFolha = $('#camada-folha');
  const camUI = $('#camada-ui');
  const camCalque = $('#camada-calque');

  /* ---------------- Desenho ---------------- */

  // BACKLOG-5 (item 5): além de 'simbolo', 'relevo' e 'texto', adicionar um tipo
  // 'imagem' aqui (logos de equipe, QR de Wikiloc, fotos). Renderiza como
  // <image href={dataURL}>; entra no export, diferente do calque. Ver README.
  /** Conteúdo interno de um item (sem o <g class="item"> externo).
      Símbolos, relevos e traçados são linhas com fill:none — clicar exatamente
      em cima do traço fino é difícil. Por isso cada um leva uma cópia invisível
      `.hit` com traço grosso e transparente: dá uma folga de clique ao redor da
      linha, sem mudar o desenho nem a caixa de seleção (getBBox ignora o traço). */
  function mioloItem(it) {
    if (it.tipo === 'simbolo') {
      const s = window.SIMBOLO_POR_ID[it.ref];
      if (!s) return '';
      const corpo = window.svgSimbolo(s, it.comprimento).replace('{{label}}', esc(it.label || s.rotulo || ''));
      return `<g class="hit" transform="translate(-50,-50)">${corpo}</g>` +
             `<g class="simbolo" transform="translate(-50,-50)">${corpo}</g>`;
    }
    if (it.tipo === 'relevo') {
      const corpo = window.RELEVOS.desenhar(it);
      return `<g class="hit">${corpo}</g><g class="relevo">${corpo}</g>`;
    }
    if (it.tipo === 'tracado') {
      const corpo = `<path d="${window.RELEVOS.tracado(it.pts, it.seed, it.rugosidade)}"/>`;
      return `<g class="hit">${corpo}</g><g class="relevo">${corpo}</g>`;
    }
    if (it.tipo === 'texto') {
      const linhas = String(it.label || '').split('\n');
      return `<text class="texto-item" font-size="${it.tamanho || 16}">` +
        linhas.map((l, i) => `<tspan x="0" dy="${i === 0 ? 0 : 1.25}em">${esc(l)}</tspan>`).join('') +
        `</text>`;
    }
    return '';
  }

  function markupItem(it) {
    if (it.tipo === 'simbolo' && !window.SIMBOLO_POR_ID[it.ref]) return '';
    const flip = it.flip ? -1 : 1;
    const t = `translate(${it.x.toFixed(1)},${it.y.toFixed(1)}) rotate(${(it.rot || 0).toFixed(1)}) scale(${(it.esc * flip).toFixed(3)},${it.esc.toFixed(3)})`;
    return `<g class="item" data-id="${it.id}" transform="${t}">${mioloItem(it)}</g>`;
  }

  function idsDeRisco() {
    return estado.itens.filter(i => i.tipo === 'simbolo').map(i => i.ref);
  }

  function desenharCalque() {
    const c = estado.calque;
    camCalque.innerHTML = c
      ? `<image href="${c.src}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" opacity="${c.op}" preserveAspectRatio="xMidYMid meet"/>`
      : '';
  }

  function desenhar() {
    desenharCalque();
    camFolha.innerHTML = window.FICHA.camadaFolha(estado, LARGURA, ALTURA, idsDeRisco());
    camItens.innerHTML = estado.itens.map(markupItem).join('');
    desenharSelecao();
    atualizarLegendaPainel();
  }

  /* ---------------- Seleção e alças ---------------- */

  function noSelecionado() {
    return sel ? camItens.querySelector(`[data-id="${sel}"]`) : null;
  }
  function itemSel() {
    return estado.itens.find(i => i.id === sel) || null;
  }

  function cantos(g) {
    const bb = g.getBBox();
    const m = g.transform.baseVal.consolidate().matrix;
    const p = (x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    return [
      p(bb.x, bb.y), p(bb.x + bb.width, bb.y),
      p(bb.x + bb.width, bb.y + bb.height), p(bb.x, bb.y + bb.height)
    ];
  }

  function desenharSelecao() {
    const g = noSelecionado();
    if (!g) { camUI.innerHTML = ''; return; }
    const c = cantos(g);
    const cx = (c[0].x + c[2].x) / 2, cy = (c[0].y + c[2].y) / 2;
    const topo = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
    let vx = topo.x - cx, vy = topo.y - cy;
    const len = Math.hypot(vx, vy) || 1;
    const gir = { x: topo.x + (vx / len) * 34, y: topo.y + (vy / len) * 34 };

    // a alça de escala fica no canto inferior direito, empurrada um pouco para
    // FORA da caixa. Antes o alvo (36px, centrado no canto) cobria o corpo de
    // itens pequenos, e o clique para arrastar acabava escalando. Agora o alvo
    // é menor e projetado para fora, deixando o interior livre para mover.
    let dxs = c[2].x - cx, dys = c[2].y - cy;
    const dl = Math.hypot(dxs, dys) || 1;
    const escP = { x: c[2].x + (dxs / dl) * 9, y: c[2].y + (dys / dl) * 9 };

    let html =
      `<polygon class="sel-caixa" points="${c.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}"/>` +
      `<line class="sel-caixa" x1="${topo.x}" y1="${topo.y}" x2="${gir.x}" y2="${gir.y}"/>` +
      `<circle class="alca-alvo" data-alca="girar" cx="${gir.x}" cy="${gir.y}" r="21"/>` +
      `<circle class="alca-alvo" data-alca="escalar" cx="${escP.x}" cy="${escP.y}" r="13"/>` +
      `<circle class="alca" data-alca="girar" cx="${gir.x}" cy="${gir.y}" r="8"/>` +
      `<rect class="alca" data-alca="escalar" x="${escP.x - 6}" y="${escP.y - 6}" width="12" height="12"/>`;

    // alça de ALONGAMENTO: só nos símbolos de progressão alongáveis. Fica na base
    // (meio de baixo), projetada para fora, no eixo em que o item estica.
    const it = itemSel();
    const s = it && it.tipo === 'simbolo' ? window.SIMBOLO_POR_ID[it.ref] : null;
    if (s && s.alongavel) {
      const botC = { x: (c[2].x + c[3].x) / 2, y: (c[2].y + c[3].y) / 2 };
      const topC = { x: (c[0].x + c[1].x) / 2, y: (c[0].y + c[1].y) / 2 };
      let bvx = botC.x - topC.x, bvy = botC.y - topC.y;
      const bl = Math.hypot(bvx, bvy) || 1;
      const aP = { x: botC.x + (bvx / bl) * 18, y: botC.y + (bvy / bl) * 18 };
      html +=
        `<line class="sel-caixa" x1="${botC.x}" y1="${botC.y}" x2="${aP.x}" y2="${aP.y}"/>` +
        `<circle class="alca-alvo" data-alca="alongar" cx="${aP.x}" cy="${aP.y}" r="15"/>` +
        `<circle class="alca alca-along" data-alca="alongar" cx="${aP.x}" cy="${aP.y}" r="8"/>`;
    }

    camUI.innerHTML = html;
  }

  function selecionar(id) {
    const mudou = sel !== id;
    sel = id;
    desenharSelecao();
    if (mudou) atualizarInspetor();
  }

  /* ---------------- Coordenadas ---------------- */

  function paraSVG(evt) {
    const p = svg.createSVGPoint();
    p.x = evt.clientX; p.y = evt.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  /* ---------------- Adicionar itens ---------------- */

  function novoId() { return 'i' + (seq++); }

  function adicionar(tipo, ref, x, y, extras) {
    const it = Object.assign({
      id: novoId(), tipo, ref,
      x: x != null ? x : LARGURA / 2,
      y: y != null ? y : ALTURA / 2,
      esc: tipo === 'relevo' ? 1 : 0.55,
      rot: 0, flip: false,
      seed: Math.floor(Math.random() * 1e6)
    }, extras || {});

    if (tipo === 'simbolo' && ref === 'rapel-id' && !it.label) {
      const n = estado.itens.filter(i => i.ref === 'rapel-id').length + 1;
      it.label = 'R' + n;
    }
    estado.itens.push(it);
    desenhar();
    selecionar(it.id);
    return it;
  }

  /* ---------------- Arrastar, escalar, girar ---------------- */

  let arraste = null;
  let modoDesenho = false;   // ferramenta "Desenhar solo" ligada
  let desenhando = null;     // { pts:[[x,y],...] } enquanto o traço é puxado

  const polyD = pts => 'M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');

  /* ---- Gestos de toque: pinça = zoom, dois dedos = arrastar a folha ---- */
  const rolagem = document.querySelector('.rolagem');
  const pointers = new Map();   // pointerId -> {x,y} em coords de tela
  let gesto = null;             // pinça/pan de dois dedos em curso

  function doisDedos() {
    const v = [...pointers.values()];
    const r = rolagem.getBoundingClientRect();
    return {
      x: (v[0].x + v[1].x) / 2 - r.left,   // ponto médio, dentro da área de rolagem
      y: (v[0].y + v[1].y) / 2 - r.top,
      dist: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y)
    };
  }

  /** Escolhe qual item pegar quando vários se sobrepõem no ponto do clique.
      Um texto captura o clique na CAIXA inteira (maior que as letras) e roubava
      linhas/símbolos vizinhos. Regra: 1) mantém o que já está selecionado se
      estiver sob o ponteiro; 2) senão, prefere linhas/símbolos a texto; 3) senão,
      o de cima. Assim clicar numa linha pega a linha, não a caixa do texto ao lado. */
  function itemNoPonto(evt) {
    const els = document.elementsFromPoint(evt.clientX, evt.clientY);
    const grupos = [];
    for (const el of els) {
      const g = el.closest ? el.closest('.item') : null;
      if (g && grupos.indexOf(g) === -1) grupos.push(g);
    }
    if (!grupos.length) return null;
    const selG = grupos.find(g => g.dataset.id === sel);
    if (selG) return selG;
    const naoTexto = grupos.find(g => {
      const it = estado.itens.find(i => i.id === g.dataset.id);
      return it && it.tipo !== 'texto';
    });
    return naoTexto || grupos[0];
  }

  svg.addEventListener('pointerdown', evt => {
    pointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    if (pointers.size === 2) {                 // dois dedos: inicia pinça/pan
      arraste = null;                          // cancela arraste iniciado pelo 1º dedo
      if (desenhando) { camUI.innerHTML = ''; desenhando = null; }
      const m = doisDedos();
      gesto = {
        z0: zoom, d0: m.dist || 1,
        ancoraX: (rolagem.scrollLeft + m.x) / zoom,
        ancoraY: (rolagem.scrollTop + m.y) / zoom
      };
      try { svg.setPointerCapture(evt.pointerId); } catch (_) {}
      return;
    }
    if (pointers.size > 2) return;

    const p = paraSVG(evt);

    // modo de desenho livre: começa a capturar o traço, ignora seleção
    if (modoDesenho) {
      desenhando = { pts: [[p.x, p.y]] };
      try { svg.setPointerCapture(evt.pointerId); } catch (_) {}
      return;
    }

    const alca = evt.target.closest('[data-alca]');
    const g = alca ? null : itemNoPonto(evt);

    if (alca && sel) {
      const it = itemSel();
      const c = cantos(noSelecionado());
      const cx = (c[0].x + c[2].x) / 2, cy = (c[0].y + c[2].y) / 2;
      if (alca.dataset.alca === 'alongar') {
        // projeta o arraste no eixo local "para baixo" do item (respeita a rotação);
        // divide pelo esc porque o comprimento é em unidades da caixa, não da tela
        const a = (it.rot || 0) * Math.PI / 180;
        const dirx = -Math.sin(a), diry = Math.cos(a);
        arraste = {
          modo: 'alongar', it, dirx, diry, esc0: it.esc || 1,
          c0: it.comprimento || 0,
          s0: (p.x - it.x) * dirx + (p.y - it.y) * diry
        };
      } else {
        arraste = {
          modo: alca.dataset.alca, it, cx, cy,
          d0: Math.hypot(p.x - cx, p.y - cy),
          e0: it.esc,
          a0: Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI - (it.rot || 0)
        };
      }
      try { svg.setPointerCapture(evt.pointerId); } catch (_) {}
      return;
    }

    if (g) {
      selecionar(g.dataset.id);
      const it = itemSel();
      arraste = { modo: 'mover', it, dx: p.x - it.x, dy: p.y - it.y };
      try { svg.setPointerCapture(evt.pointerId); } catch (_) {}
    } else {
      selecionar(null);
    }
  });

  svg.addEventListener('pointermove', evt => {
    if (pointers.has(evt.pointerId)) pointers.set(evt.pointerId, { x: evt.clientX, y: evt.clientY });
    if (gesto && pointers.size >= 2) {         // pinça = zoom + pan ancorado nos dedos
      const m = doisDedos();
      aplicarZoom(gesto.z0 * (m.dist / gesto.d0));
      rolagem.scrollLeft = gesto.ancoraX * zoom - m.x;
      rolagem.scrollTop = gesto.ancoraY * zoom - m.y;
      return;
    }
    if (desenhando) {
      const p = paraSVG(evt);
      const last = desenhando.pts[desenhando.pts.length - 1];
      if (Math.hypot(p.x - last[0], p.y - last[1]) >= 6) {
        desenhando.pts.push([p.x, p.y]);
        camUI.innerHTML = `<path class="tracado-preview" d="${polyD(desenhando.pts)}"/>`;
      }
      return;
    }
    if (!arraste) return;
    const p = paraSVG(evt);
    const it = arraste.it;

    if (arraste.modo === 'mover') {
      it.x = Math.round(p.x - arraste.dx);
      it.y = Math.round(p.y - arraste.dy);
    } else if (arraste.modo === 'escalar') {
      const d = Math.hypot(p.x - arraste.cx, p.y - arraste.cy);
      it.esc = Math.min(6, Math.max(0.12, arraste.e0 * (d / (arraste.d0 || 1))));
    } else if (arraste.modo === 'girar') {
      let a = Math.atan2(p.y - arraste.cy, p.x - arraste.cx) * 180 / Math.PI - arraste.a0;
      if (evt.shiftKey) a = Math.round(a / 15) * 15;
      it.rot = Math.round(a);
    } else if (arraste.modo === 'alongar') {
      const s = (p.x - it.x) * arraste.dirx + (p.y - it.y) * arraste.diry;
      const comp = arraste.c0 + (s - arraste.s0) / (arraste.esc0 || 1);
      it.comprimento = Math.round(Math.min(260, Math.max(0, comp)));
    }
    // alongar muda o traçado (não só o transform), então remonta o miolo
    if (arraste.modo === 'alongar') redesenharMiolo(it); else redesenharItem(it);
    desenharSelecao();
    sincronizarInspetor(it);
  });

  /** Espelha no painel os valores mudados pelo arraste, sem remontá-lo. */
  function sincronizarInspetor(it) {
    const e = $('#in-esc'), r = $('#in-rot'), cp = $('#in-comp');
    if (e) { e.value = Math.round(it.esc * 100); e.closest('.campo').querySelector('b').textContent = e.value + '%'; }
    if (r) { r.value = it.rot || 0; r.closest('.campo').querySelector('b').textContent = (it.rot || 0) + '°'; }
    if (cp) { cp.value = it.comprimento || 0; cp.closest('.campo').querySelector('b').textContent = it.comprimento || 0; }
  }

  ['pointerup', 'pointercancel'].forEach(ev =>
    svg.addEventListener(ev, evt => {
      pointers.delete(evt.pointerId);
      if (gesto) { if (pointers.size < 2) gesto = null; return; }
      arraste = null;
      if (desenhando) { finalizarTracado(desenhando.pts); desenhando = null; }
    }));

  // rede de segurança: se um ponteiro terminar fora do svg, ainda limpa o mapa
  // (senão um pointerup perdido deixaria o gesto travado — um toque viraria "2 dedos")
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev =>
    window.addEventListener(ev, evt => {
      pointers.delete(evt.pointerId);
      if (pointers.size < 2) gesto = null;
    }));

  /** Fecha um traço livre: torna os pontos locais e cria o item 'tracado'. */
  function finalizarTracado(pts) {
    camUI.innerHTML = '';
    if (!pts || pts.length < 2) return;   // só um clique, sem arrastar
    const ox = pts[0][0], oy = pts[0][1];
    const locais = pts.map(p => [+(p[0] - ox).toFixed(1), +(p[1] - oy).toFixed(1)]);
    adicionar('tracado', 'tracado', Math.round(ox), Math.round(oy), { esc: 1, pts: locais, rugosidade: 3 });
    setModoDesenho(false);   // após desenhar, volta ao cursor normal (item novo fica selecionado)
  }

  function setModoDesenho(on) {
    modoDesenho = on;
    const bt = $('#bt-tracado');
    bt.setAttribute('aria-pressed', on ? 'true' : 'false');
    bt.classList.toggle('ativo', on);
    svg.style.cursor = on ? 'crosshair' : '';
    if (on) selecionar(null);
  }

  /** Redesenha o conteúdo de um item sem reconstruir o painel — é o que
      permite digitar num campo de texto sem perder o foco a cada tecla. */
  function redesenharMiolo(it) {
    const g = camItens.querySelector(`[data-id="${it.id}"]`);
    if (!g) return;
    // monta direto no SVG: passar por um <div> HTML aninharia tags auto-fechadas
    // (a seta .fill viraria filha da haste e sumiria)
    g.innerHTML = mioloItem(it);
  }

  /** Atualiza só o transform do item em movimento (mais leve que redesenhar tudo). */
  function redesenharItem(it) {
    const g = camItens.querySelector(`[data-id="${it.id}"]`);
    if (!g) return;
    const flip = it.flip ? -1 : 1;
    g.setAttribute('transform',
      `translate(${it.x.toFixed(1)},${it.y.toFixed(1)}) rotate(${(it.rot || 0).toFixed(1)}) scale(${(it.esc * flip).toFixed(3)},${it.esc.toFixed(3)})`);
  }

  /* ---------------- Teclado ---------------- */

  document.addEventListener('keydown', evt => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(evt.target.tagName)) return;
    const it = itemSel();
    if (evt.key === 'Escape') { if (modoDesenho) setModoDesenho(false); selecionar(null); return; }
    if (!it) return;

    const passo = evt.shiftKey ? 10 : 1;
    if (evt.key === 'ArrowLeft') { it.x -= passo; }
    else if (evt.key === 'ArrowRight') { it.x += passo; }
    else if (evt.key === 'ArrowUp') { it.y -= passo; }
    else if (evt.key === 'ArrowDown') { it.y += passo; }
    else if (evt.key === 'Delete' || evt.key === 'Backspace') { excluir(); return; }
    else if (evt.key.toLowerCase() === 'd' && (evt.ctrlKey || evt.metaKey)) { duplicar(); evt.preventDefault(); return; }
    else return;

    evt.preventDefault();
    redesenharItem(it);
    desenharSelecao();
  });

  function excluir() {
    estado.itens = estado.itens.filter(i => i.id !== sel);
    sel = null;
    desenhar();
    atualizarInspetor();
  }
  function duplicar() {
    const it = itemSel(); if (!it) return;
    const copia = Object.assign({}, it, { id: novoId(), x: it.x + 24, y: it.y + 24 });
    estado.itens.push(copia);
    desenhar();
    selecionar(copia.id);
  }

  /* ---------------- Paleta ---------------- */

  function miniatura(s) {
    return `<svg viewBox="0 0 100 100" aria-hidden="true"><g class="simbolo">${window.svgSimbolo(s, 0).replace('{{label}}', s.rotulo || '')}</g></svg>`;
  }

  function montarPaleta() {
    const alvo = $('#paleta');
    let html = '';
    window.CATEGORIAS.forEach(cat => {
      const itens = window.SIMBOLOS.filter(s => s.cat === cat.id);
      html += `<section class="grupo" data-cat="${cat.id}"><h3>${cat.nome}</h3><div class="grade">`;
      itens.forEach(s => {
        html += `<button class="ficha-simbolo${s.risco ? ' risco' : ''}" draggable="true"
                   data-tipo="simbolo" data-ref="${s.id}" title="${esc(s.nome)}${s.risco ? ' — item de risco, entra na legenda' : ''}">
                   ${miniatura(s)}<span>${esc(s.nome)}</span>${s.risco ? '<i class="ast">*</i>' : ''}</button>`;
      });
      html += `</div></section>`;
    });

    // Relevos
    const rel = window.RELEVOS.catalogo();
    const grupos = [...new Set(rel.map(r => r.grupo))];
    grupos.forEach(gr => {
      html += `<section class="grupo" data-cat="relevo"><h3>${gr}</h3><div class="grade grade-relevo">`;
      rel.filter(r => r.grupo === gr).forEach(r => {
        const corpo = window.RELEVOS.desenhar({ ref: r.ref, seed: 7 });
        html += `<button class="ficha-simbolo" draggable="true" data-tipo="relevo" data-ref="${r.ref}" title="${esc(r.nome)}">
                   <svg viewBox="${r.vb}" preserveAspectRatio="xMidYMid meet"><g class="relevo">${corpo}</g></svg>
                   <span>${esc(r.nome)}</span></button>`;
      });
      html += `</div></section>`;
    });

    alvo.innerHTML = html;
  }

  /* clicar no cabeçalho recolhe/abre a categoria; nos itens, adiciona */
  $('#paleta').addEventListener('click', evt => {
    const h = evt.target.closest('h3');
    if (h && h.parentElement) { h.parentElement.classList.toggle('fechado'); return; }
    const b = evt.target.closest('.ficha-simbolo');
    if (!b) return;
    adicionar(b.dataset.tipo, b.dataset.ref);
  });

  $('#paleta').addEventListener('dragstart', evt => {
    const b = evt.target.closest('.ficha-simbolo');
    if (!b) return;
    evt.dataTransfer.setData('text/plain', JSON.stringify({ tipo: b.dataset.tipo, ref: b.dataset.ref }));
    evt.dataTransfer.effectAllowed = 'copy';
  });

  svg.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  svg.addEventListener('drop', e => {
    e.preventDefault();
    let dado; try { dado = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (_) { return; }
    const p = paraSVG(e);
    adicionar(dado.tipo, dado.ref, Math.round(p.x), Math.round(p.y));
  });

  /* busca */
  $('#busca').addEventListener('input', evt => {
    const q = evt.target.value.trim().toLowerCase();
    // durante a busca, mostra os itens mesmo em categorias recolhidas
    $('#paleta').classList.toggle('buscando', !!q);
    $$('#paleta .ficha-simbolo').forEach(b => {
      const nome = b.querySelector('span').textContent.toLowerCase();
      b.hidden = q && !nome.includes(q);
    });
    $$('#paleta .grupo').forEach(g => {
      g.hidden = !g.querySelector('.ficha-simbolo:not([hidden])');
    });
  });

  /* ---------------- Inspetor ---------------- */

  function atualizarInspetor() {
    const it = itemSel();
    const box = $('#inspetor');
    if (!it) {
      box.innerHTML = `<p class="vazio">Nenhum item selecionado. Clique em um símbolo na folha para editar, ou arraste um da paleta.</p>`;
      return;
    }
    const s = it.tipo === 'simbolo' ? window.SIMBOLO_POR_ID[it.ref] : null;
    const nome = s ? s.nome : (it.tipo === 'texto' ? 'Texto' : it.tipo === 'tracado' ? 'Traçado livre (solo/parede)' : it.ref);
    const aceitaRotulo = it.tipo === 'texto' || (s && s.rotulo);

    box.innerHTML = `
      <p class="alvo">${esc(nome)}${s && s.risco ? ' <i class="ast">*</i>' : ''}</p>
      ${aceitaRotulo ? `
      <label class="campo"><span>${it.tipo === 'texto' ? 'Texto' : 'Rótulo'}</span>
        <textarea id="in-label" rows="${it.tipo === 'texto' ? 3 : 1}">${esc(it.label || '')}</textarea>
      </label>` : ''}
      ${it.tipo === 'texto' ? `
      <label class="campo"><span>Corpo do texto <b>${it.tamanho || 16}px</b></span>
        <input id="in-tamanho" type="range" min="9" max="42" value="${it.tamanho || 16}">
      </label>` : ''}
      ${s && s.alongavel ? `
      <label class="campo"><span>Alongamento <b>${it.comprimento || 0}</b></span>
        <input id="in-comp" type="range" min="0" max="260" value="${it.comprimento || 0}">
      </label>` : ''}
      ${it.tipo === 'tracado' ? `
      <label class="campo"><span>Rugosidade <b>${it.rugosidade || 0}</b></span>
        <input id="in-rug" type="range" min="0" max="12" value="${it.rugosidade || 0}">
      </label>` : ''}
      <label class="campo"><span>Tamanho <b>${Math.round(it.esc * 100)}%</b></span>
        <input id="in-esc" type="range" min="12" max="300" value="${Math.round(it.esc * 100)}">
      </label>
      <label class="campo"><span>Rotação <b>${it.rot || 0}°</b></span>
        <input id="in-rot" type="range" min="-180" max="180" value="${it.rot || 0}">
      </label>
      <div class="botoes">
        <button id="bt-flip">Espelhar</button>
        <button id="bt-frente">Trazer à frente</button>
        <button id="bt-tras">Enviar para trás</button>
        <button id="bt-dup">Duplicar</button>
        <button id="bt-del" class="perigo">Excluir</button>
      </div>`;

    const label = $('#in-label');
    if (label) label.addEventListener('input', e => {
      it.label = e.target.value;
      redesenharMiolo(it); desenharSelecao();
    });
    const tam = $('#in-tamanho');
    if (tam) tam.addEventListener('input', e => {
      it.tamanho = +e.target.value;
      e.target.closest('.campo').querySelector('b').textContent = it.tamanho + 'px';
      redesenharMiolo(it); desenharSelecao();
    });
    const comp = $('#in-comp');
    if (comp) comp.addEventListener('input', e => {
      it.comprimento = +e.target.value;
      e.target.closest('.campo').querySelector('b').textContent = it.comprimento;
      // muda o traçado (não só o transform) e a caixa de seleção acompanha
      redesenharMiolo(it); desenharSelecao();
    });
    const rug = $('#in-rug');
    if (rug) rug.addEventListener('input', e => {
      it.rugosidade = +e.target.value;
      e.target.closest('.campo').querySelector('b').textContent = it.rugosidade;
      redesenharMiolo(it); desenharSelecao();
    });
    $('#in-esc').addEventListener('input', e => {
      it.esc = +e.target.value / 100;
      e.target.closest('.campo').querySelector('b').textContent = e.target.value + '%';
      redesenharItem(it); desenharSelecao();
    });
    $('#in-rot').addEventListener('input', e => {
      it.rot = +e.target.value;
      e.target.closest('.campo').querySelector('b').textContent = it.rot + '°';
      redesenharItem(it); desenharSelecao();
    });
    $('#bt-flip').addEventListener('click', () => { it.flip = !it.flip; redesenharItem(it); desenharSelecao(); });
    $('#bt-frente').addEventListener('click', () => { mover(it, +1); });
    $('#bt-tras').addEventListener('click', () => { mover(it, -1); });
    $('#bt-dup').addEventListener('click', duplicar);
    $('#bt-del').addEventListener('click', excluir);
  }

  function mover(it, dir) {
    const i = estado.itens.indexOf(it);
    const j = dir > 0 ? estado.itens.length - 1 : 0;
    estado.itens.splice(i, 1);
    estado.itens.splice(j, 0, it);
    desenhar(); selecionar(it.id);
  }

  /* ---------------- Painel da folha e ficha ---------------- */

  let formsLigados = false;

  function montarPainelFolha() {
    const m = estado.meta;
    const f = estado.folha;
    const ehPersonalizado = f.formato === 'personalizado';

    $('#form-folha').innerHTML = `
      <label class="campo"><span>Formato da folha</span>
        <select id="in-formato">${FORMATOS.map(fo =>
          `<option value="${fo.id}"${fo.id === f.formato ? ' selected' : ''}>${fo.nome}${
            fo.id === 'personalizado' ? '' : ` — ${fo.l}x${fo.a} mm`}</option>`).join('')}</select></label>
      <div id="medidas" class="dupla"${ehPersonalizado ? '' : ' hidden'}>
        <label class="campo"><span>Largura (mm)</span><input id="in-larg" type="number" min="80" max="1200" value="${f.larguraMm}"></label>
        <label class="campo"><span>Altura (mm)</span><input id="in-alt" type="number" min="80" max="1200" value="${f.alturaMm}"></label>
      </div>
      <label class="caixa"><input id="in-ajustar" type="checkbox" checked>
        <span>Reposicionar o desenho ao trocar de formato</span></label>
      <hr class="regua">
      <label class="campo"><span>Título do croqui</span><input data-meta="titulo" value="${esc(m.titulo)}"></label>
      <label class="campo"><span>Nome do croquista</span><input data-meta="croquista" value="${esc(m.croquista)}"></label>
      <label class="campo"><span>Abertura em</span><input data-meta="abertura" placeholder="mm/aaaa" value="${esc(m.abertura)}"></label>
      <label class="campo"><span>Equipe de abertura (um nome por linha)</span><textarea data-meta="equipe" rows="3">${esc((m.equipe || []).join('\n'))}</textarea></label>
      <label class="campo"><span>Observações da folha</span><textarea data-meta="nota" rows="4" placeholder="Acesso por propriedade particular, necessidade de 4x4, autorizações…">${esc(m.nota)}</textarea></label>`;

    $('#form-ficha').innerHTML = window.FICHA.CAMPOS.map(c => `
      <label class="campo"><span>${esc(c.rotulo)}</span>
        <input data-ficha="${c.k}" placeholder="${esc(c.exemplo)}" value="${esc(estado.ficha[c.k] || '')}"></label>`).join('');

    const ajustar = () => $('#in-ajustar').checked;

    $('#in-formato').addEventListener('change', e => {
      const fo = FORMATOS.find(x => x.id === e.target.value);
      const personalizado = fo.id === 'personalizado';
      const L = personalizado ? estado.folha.larguraMm : fo.l;
      const A = personalizado ? estado.folha.alturaMm : fo.a;
      trocarFormato(fo.id, L, A, ajustar());
      montarPainelFolha();
    });

    ['#in-larg', '#in-alt'].forEach(sel => {
      const campo = $(sel); if (!campo) return;
      campo.addEventListener('change', () => {
        const L = Math.min(1200, Math.max(80, +$('#in-larg').value || 297));
        const A = Math.min(1200, Math.max(80, +$('#in-alt').value || 210));
        trocarFormato('personalizado', L, A, ajustar());
      });
    });

    if (formsLigados) return;
    formsLigados = true;

    $('#form-folha').addEventListener('input', evt => {
      const k = evt.target.dataset.meta; if (!k) return;
      estado.meta[k] = k === 'equipe'
        ? evt.target.value.split('\n').map(s => s.trim()).filter(Boolean)
        : evt.target.value;
      desenhar();
    });
    $('#form-ficha').addEventListener('input', evt => {
      const k = evt.target.dataset.ficha; if (!k) return;
      estado.ficha[k] = evt.target.value;
      desenhar();
    });
  }

  function atualizarLegendaPainel() {
    const usados = window.SIMBOLOS_RISCO.filter(s => idsDeRisco().includes(s.id));
    const box = $('#legenda-painel');
    if (!usados.length) {
      box.innerHTML = `<p class="vazio">Nenhum item de risco na folha. Se houver sifão, refluxo, marmita e afins, eles aparecem aqui e na legenda impressa automaticamente.</p>`;
      return;
    }
    box.innerHTML = `<ul>${usados.map(s => `<li><i class="ast">*</i> ${esc(s.nome)}</li>`).join('')}</ul>`;
  }

  /* ---------------- Formato da folha ---------------- */

  /** Ajusta o SVG, a grade e o estilo de impressão ao formato guardado no estado. */
  function aplicarFormato() {
    const f = estado.folha;
    LARGURA = mmParaPx(f.larguraMm);
    ALTURA = mmParaPx(f.alturaMm);

    svg.setAttribute('viewBox', `0 0 ${LARGURA} ${ALTURA}`);
    const fundo = $('#fundo');
    fundo.setAttribute('width', LARGURA);
    fundo.setAttribute('height', ALTURA);

    $('#grade').innerHTML = `
      <defs>
        <pattern id="malha" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0 H0 V40" fill="none" stroke="#e9ecec" stroke-width="1"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="${LARGURA}" height="${ALTURA}" fill="url(#malha)"/>
      <rect x="28" y="28" width="${LARGURA - 56}" height="${ALTURA - 56}" fill="none" stroke="#dfe4e4" stroke-width="1"/>`;

    // o navegador usa isto na hora de gerar o PDF
    $('#estilo-impressao').textContent =
      `@page { size: ${f.larguraMm}mm ${f.alturaMm}mm; margin: 0; }\n` +
      `@media print { #folha { width: ${f.larguraMm}mm !important; } }`;

    aplicarZoom(zoom);
  }

  /** Troca o formato, opcionalmente reposicionando o que já está desenhado. */
  function trocarFormato(id, larguraMm, alturaMm, ajustarDesenho) {
    const antesL = LARGURA, antesA = ALTURA;
    estado.folha = { formato: id, larguraMm, alturaMm };
    aplicarFormato();

    if (ajustarDesenho && (antesL !== LARGURA || antesA !== ALTURA)) {
      const rx = LARGURA / antesL, ry = ALTURA / antesA;
      const rMenor = Math.min(rx, ry);
      estado.itens.forEach(it => {
        it.x = Math.round(it.x * rx);
        it.y = Math.round(it.y * ry);
        it.esc = +(it.esc * rMenor).toFixed(3);
      });
    }
    desenhar();
  }

  /* ---------------- Calque (imagem de referência) ---------------- */

  $('#bt-calque').addEventListener('click', () => $('#arquivo-calque').click());

  $('#arquivo-calque').addEventListener('change', evt => {
    const f = evt.target.files[0]; if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = () => {
        const largura = Math.min(LARGURA * 0.92, img.naturalWidth);
        const altura = largura * (img.naturalHeight / img.naturalWidth);
        estado.calque = {
          src: leitor.result,
          w: Math.round(largura), h: Math.round(altura),
          x: Math.round((LARGURA - largura) / 2),
          y: Math.round((ALTURA - altura) / 2),
          op: 0.45,
          proporcao: img.naturalHeight / img.naturalWidth
        };
        montarPainelCalque(); desenharCalque();
      };
      img.onerror = () => alert('Não foi possível ler essa imagem. Use PNG ou JPG.');
      img.src = leitor.result;
    };
    leitor.readAsDataURL(f);
    evt.target.value = '';
  });

  function montarPainelCalque() {
    const c = estado.calque;
    const box = $('#calque-controles');
    if (!c) {
      box.innerHTML = `<p class="vazio">Nenhuma imagem carregada. Serve foto de croqui em papel, print de PDF ou esboço de campo — qualquer PNG ou JPG.</p>`;
      return;
    }
    box.innerHTML = `
      <label class="campo"><span>Opacidade <b>${Math.round(c.op * 100)}%</b></span>
        <input id="cal-op" type="range" min="5" max="100" value="${Math.round(c.op * 100)}"></label>
      <label class="campo"><span>Largura <b>${c.w} px</b></span>
        <input id="cal-w" type="range" min="200" max="1600" value="${c.w}"></label>
      <label class="campo"><span>Posição horizontal</span>
        <input id="cal-x" type="range" min="-400" max="${LARGURA}" value="${c.x}"></label>
      <label class="campo"><span>Posição vertical</span>
        <input id="cal-y" type="range" min="-400" max="${ALTURA}" value="${c.y}"></label>
      <div class="botoes"><button id="cal-remover" class="perigo">Remover calque</button></div>`;

    $('#cal-op').addEventListener('input', e => {
      c.op = +e.target.value / 100; desenharCalque();
      e.target.closest('.campo').querySelector('b').textContent = e.target.value + '%';
    });
    $('#cal-w').addEventListener('input', e => {
      c.w = +e.target.value; c.h = Math.round(c.w * c.proporcao); desenharCalque();
      e.target.closest('.campo').querySelector('b').textContent = c.w + ' px';
    });
    $('#cal-x').addEventListener('input', e => { c.x = +e.target.value; desenharCalque(); });
    $('#cal-y').addEventListener('input', e => { c.y = +e.target.value; desenharCalque(); });
    $('#cal-remover').addEventListener('click', () => {
      estado.calque = null; montarPainelCalque(); desenharCalque();
    });
  }

  /* ---------------- Zoom ---------------- */

  function aplicarZoom(z) {
    zoom = Math.min(2.2, Math.max(0.35, z));
    $('#folha').style.width = (LARGURA * zoom) + 'px';
    $('#zoom-valor').textContent = Math.round(zoom * 100) + '%';
  }
  $('#zoom-mais').addEventListener('click', () => aplicarZoom(zoom + 0.1));
  $('#zoom-menos').addEventListener('click', () => aplicarZoom(zoom - 0.1));
  $('#zoom-ajustar').addEventListener('click', () => {
    const disp = $('#mesa').clientWidth - 64;
    aplicarZoom(disp / LARGURA);
  });

  /* ---------------- Exportação ---------------- */

  function svgLimpo() {
    const clone = svg.cloneNode(true);
    clone.querySelectorAll('.so-tela').forEach(n => n.remove());
    clone.setAttribute('width', LARGURA);
    clone.setAttribute('height', ALTURA);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    return new XMLSerializer().serializeToString(clone);
  }

  function baixar(blob, nome) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const nomeArquivo = ext =>
    (estado.meta.titulo || 'croqui').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-|-$/g, '') + '.' + ext;

  $('#bt-svg').addEventListener('click', () => {
    baixar(new Blob([svgLimpo()], { type: 'image/svg+xml' }), nomeArquivo('svg'));
  });

  $('#bt-png').addEventListener('click', () => {
    const escala = 2;
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = LARGURA * escala; cv.height = ALTURA * escala;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => baixar(b, nomeArquivo('png')), 'image/png');
    };
    img.onerror = () => alert('Não foi possível gerar o PNG. Exporte em SVG e converta fora do navegador.');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgLimpo());
  });

  $('#bt-pdf').addEventListener('click', () => {
    // a folha já é A4 paisagem; a folha de estilo de impressão manda o resto sumir
    window.print();
  });

  $('#bt-json').addEventListener('click', () => {
    const { calque, ...semCalque } = estado;
    const dados = JSON.stringify({ versao: 1, ...semCalque }, null, 2);
    baixar(new Blob([dados], { type: 'application/json' }), nomeArquivo('json'));
  });

  $('#bt-abrir').addEventListener('click', () => $('#arquivo').click());
  $('#arquivo').addEventListener('change', evt => {
    const f = evt.target.files[0]; if (!f) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      try {
        const dados = JSON.parse(leitor.result);
        const calqueAtual = estado.calque;
        estado = {
          meta: dados.meta || vazio().meta,
          ficha: dados.ficha || {},
          itens: dados.itens || [],
          folha: dados.folha || vazio().folha,
          calque: calqueAtual
        };
        aplicarFormato();
        seq = estado.itens.length + 1;
        estado.itens.forEach((it, i) => { it.id = 'i' + (i + 1); });
        seq = estado.itens.length + 1;
        sel = null;
        montarPainelFolha(); desenhar(); atualizarInspetor();
      } catch (_) {
        alert('Arquivo inválido. Escolha um .json exportado por este editor.');
      }
    };
    leitor.readAsText(f);
    evt.target.value = '';
  });

  $('#bt-novo').addEventListener('click', () => {
    if (!confirm('Começar uma folha nova? O que estiver na tela e não foi salvo se perde.')) return;
    const calqueAtual = estado.calque;
    estado = vazio(); estado.calque = calqueAtual; sel = null; seq = 1;
    aplicarFormato(); montarPainelFolha(); desenhar(); atualizarInspetor();
    abrirModal('folha');   // define o formato da folha nova
  });

  $('#bt-texto').addEventListener('click', () => {
    if (modoDesenho) setModoDesenho(false);
    adicionar('texto', 'texto', LARGURA / 2, ALTURA / 2, { esc: 1, label: 'Texto', tamanho: 16 });
  });

  $('#bt-tracado').addEventListener('click', () => setModoDesenho(!modoDesenho));

  /* ---------------- Exemplo ---------------- */

  $('#bt-exemplo').addEventListener('click', carregarExemplo);

  function carregarExemplo() {
    estado = {
      meta: {
        titulo: 'Croqui Cânion do teste',
        croquista: 'Nome do croquista',
        abertura: '05/2024',
        equipe: ['Beltrano', 'Ciclano', 'Fulano'],
        nota: 'Terreno do seu João, tem que conversar com ele\nantes para abrir a porteira.\nNa trilha de ida tem abelha, fazer em silêncio.'
      },
      ficha: {
        cidade: 'Baldim - MG', afluente: 'Rio Claro', estacao: 'Outono',
        aproximacao: '1:30  2 km', progressao: '5 h  1,7 km', desnivel: '210 m',
        retorno: '1 h  2 km', carros: 'x1', maiorRapel: '60 m', cordas: '3x60',
        rocha: 'Arenito', latEstacionamento: '-19.2801, -43.9612',
        latEntrada: '-19.2833, -43.9570', latSaida: '-19.2902, -43.9488'
      },
      itens: [],
      folha: { formato: 'a4-paisagem', larguraMm: 297, alturaMm: 210 },
      calque: estado.calque
    };
    aplicarFormato();
    sel = null; seq = 1;

    const add = (tipo, ref, x, y, extras) => {
      const it = Object.assign({
        id: novoId(), tipo, ref, x, y, esc: tipo === 'relevo' ? 1 : 0.5,
        rot: 0, flip: false, seed: 4242
      }, extras || {});
      estado.itens.push(it);
    };

    /* Trecho 1 — entrada, R1 e caminhada até a desescalada */
    add('simbolo', 'inicio-canyon', 58, 52, { esc: 0.6 });
    add('texto', 'texto', 92, 46, { esc: 1, label: 'MD', tamanho: 18 });
    add('simbolo', 'ancoragens-fixas', 142, 96, { esc: 0.32 });
    add('texto', 'texto', 130, 74, { esc: 1, label: 'MD', tamanho: 16 });
    add('relevo', 'queda:rampada:20-40', 70, 88);
    add('simbolo', 'rapel-id', 98, 150, { esc: 0.45, label: 'R1' });
    add('texto', 'texto', 44, 212, { esc: 1, label: '30 m', tamanho: 16 });
    add('relevo', 'caminhada-blocos:100', 148, 238);
    add('simbolo', 'rapel-molhado', 236, 214, { esc: 0.4 });
    add('simbolo', 'estreitos', 306, 208, { esc: 0.36 });
    add('relevo', 'queda:desescalada:10-20', 268, 248);
    add('texto', 'texto', 300, 322, { esc: 1, label: '15 m', tamanho: 16 });
    add('relevo', 'caminhada:100', 299, 338);

    /* Trecho 2 — R2, o rapel maior, poço com refluxo */
    add('simbolo', 'ancoragens-fixas', 452, 318, { esc: 0.32 });
    add('simbolo', 'ancoragens-fixas', 528, 318, { esc: 0.32 });
    add('texto', 'texto', 478, 300, { esc: 1, label: 'MD', tamanho: 16 });
    add('simbolo', 'corrimao', 490, 340, { esc: 0.34 });
    add('simbolo', 'rapel-id', 470, 378, { esc: 0.45, label: 'R2' });
    add('relevo', 'queda:vertical:40-60', 474, 392);
    add('texto', 'texto', 420, 500, { esc: 1, label: '60 m', tamanho: 16 });
    add('simbolo', 'rapel-molhado', 522, 470, { esc: 0.4 });
    add('simbolo', 'refluxo', 548, 588, { esc: 0.38 });
    add('relevo', 'poco:20', 460, 604);
    add('relevo', 'caminhada:50', 552, 634);
    add('texto', 'texto', 596, 660, { esc: 1, label: '10 m', tamanho: 16 });
    add('simbolo', 'continua-pagina', 660, 648, { esc: 0.38 });

    /* Trecho 3 — retomada no alto à direita, R3 e saída */
    add('simbolo', 'continua-pagina', 596, 146, { esc: 0.38 });
    add('simbolo', 'arvores', 690, 140, { esc: 0.42 });
    add('texto', 'texto', 724, 128, { esc: 1, label: 'ME\nAA', tamanho: 18 });
    add('simbolo', 'rapel-id', 690, 208, { esc: 0.45, label: 'R3' });
    add('simbolo', 'abrasao-forte', 738, 194, { esc: 0.4 });
    add('relevo', 'queda:rampada:40-60', 700, 222);
    add('texto', 'texto', 730, 318, { esc: 1, label: '50 m', tamanho: 16 });
    add('simbolo', 'rapel-molhado', 796, 288, { esc: 0.4 });
    add('simbolo', 'via-de-escape', 986, 268, { esc: 0.8 });
    add('relevo', 'caminhada-blocos:100', 812, 437);
    add('relevo', 'poco:30', 932, 447);
    add('texto', 'texto', 1028, 414, { esc: 1, label: 'MD', tamanho: 16 });
    add('simbolo', 'final-canyon', 1076, 468, { esc: 0.58 });

    montarPainelFolha();
    desenhar();
    atualizarInspetor();
  }

  /* ---------------- Abas do painel direito ---------------- */

  $$('.aba').forEach(bt => bt.addEventListener('click', () => {
    $$('.aba').forEach(b => b.setAttribute('aria-selected', b === bt));
    $$('.painel').forEach(p => p.hidden = p.id !== bt.dataset.painel);
  }));

  /* ---------------- Gavetas (tablet): paleta e painéis deslizantes ---------------- */

  const colEsq = $('.coluna-esq'), colDir = $('.coluna-dir'), backdrop = $('#drawer-backdrop');

  function fecharGavetas() {
    colEsq.classList.remove('aberta');
    colDir.classList.remove('aberta');
    backdrop.hidden = true;
    $('#bt-drawer-esq').setAttribute('aria-pressed', 'false');
    $('#bt-drawer-dir').setAttribute('aria-pressed', 'false');
  }
  function abrirGaveta(qual) {
    const alvo = qual === 'esq' ? colEsq : colDir;
    const jaAberta = alvo.classList.contains('aberta');
    fecharGavetas();
    if (!jaAberta) {
      alvo.classList.add('aberta');
      backdrop.hidden = false;
      $(qual === 'esq' ? '#bt-drawer-esq' : '#bt-drawer-dir').setAttribute('aria-pressed', 'true');
    }
  }
  $('#bt-drawer-esq').addEventListener('click', () => abrirGaveta('esq'));
  $('#bt-drawer-dir').addEventListener('click', () => abrirGaveta('dir'));
  backdrop.addEventListener('click', fecharGavetas);
  // escolher um símbolo/relevo na paleta fecha a gaveta (fluxo de toque)
  $('#paleta').addEventListener('click', evt => {
    if (evt.target.closest('.ficha-simbolo')) fecharGavetas();
  });

  /* ---------------- Modal de início: novo projeto + tutorial ---------------- */

  const DIMS_BASE = { a4: [297, 210], a3: [420, 297], a2: [594, 420], carta: [279, 216] };

  const TUTORIAL = [
    { t: 'A paleta de símbolos', p: 'À esquerda ficam os símbolos da CBC, por categoria. Clique para inserir no centro da folha, ou arraste até o ponto exato. As categorias abrem e fecham no título.',
      svg: `<rect x="12" y="14" width="20" height="20" rx="3"/><rect x="40" y="14" width="20" height="20" rx="3"/><rect x="68" y="14" width="20" height="20" rx="3"/><rect x="12" y="44" width="20" height="20" rx="3"/><rect x="40" y="44" width="20" height="20" rx="3"/><rect x="68" y="44" width="20" height="20" rx="3"/>` },
    { t: 'Editar um item', p: 'Clique num item para selecioná-lo e arraste para mover. As alças giram (em cima), redimensionam (canto) e — nos rapéis e saltos — alongam (embaixo). Setas do teclado ajustam fino; Delete apaga.',
      svg: `<rect x="30" y="24" width="40" height="34" fill="none" stroke-dasharray="5 3"/><circle cx="50" cy="14" r="5" fill="currentColor" stroke="none"/><rect x="65" y="53" width="10" height="10" fill="currentColor" stroke="none"/><circle cx="50" cy="68" r="5" fill="currentColor" stroke="none"/>` },
    { t: 'Desenhar o solo', p: 'Precisa da linha do chão ou das paredes? Toque em "Desenhar solo", trace à mão e solte — vira uma linha no estilo do croqui, com rugosidade ajustável no painel.',
      svg: `<path d="M6 42 q12 -13 24 0 q12 13 24 0 q12 -13 24 0 q6 6 10 2" fill="none"/>` },
    { t: 'Ficha e exportação', p: 'Preencha a ficha de informações mínimas — a legenda de itens de risco se monta sozinha. Exporte em PNG, PDF ou SVG, ou salve o projeto (.json) para reabrir e continuar depois.',
      svg: `<path d="M50 10 V50" fill="none"/><path d="M35 37 L50 52 L65 37" fill="none"/><path d="M20 60 H80" fill="none"/>` }
  ];

  const modal = $('#modal-inicio');
  let baseSel = 'a4', orientSel = 'paisagem', tutIndex = 0, modalModo = 'completo';

  function dimsEscolhidas() {
    const [x, y] = DIMS_BASE[baseSel];
    return orientSel === 'paisagem' ? [Math.max(x, y), Math.min(x, y)] : [Math.min(x, y), Math.max(x, y)];
  }
  function atualizarResultado() {
    const [L, A] = dimsEscolhidas();
    const nomes = { a4: 'A4', a3: 'A3', a2: 'A2', carta: 'Carta' };
    $('#modal-resultado').textContent = `${nomes[baseSel]} ${orientSel} · ${L} × ${A} mm`;
  }
  function mostrarEtapa(nome) {
    modal.querySelectorAll('.modal-etapa').forEach(e => { e.hidden = e.dataset.etapa !== nome; });
  }
  function renderTutorial() {
    const s = TUTORIAL[tutIndex];
    $('#tut-slides').innerHTML =
      `<div class="tut-slide"><div class="tut-icone"><svg viewBox="0 0 100 78" aria-hidden="true">${s.svg}</svg></div>` +
      `<h3>${esc(s.t)}</h3><p>${esc(s.p)}</p></div>`;
    $('#tut-pontos').innerHTML = TUTORIAL.map((_, i) => `<span class="${i === tutIndex ? 'ativo' : ''}"></span>`).join('');
    $('#tut-proximo').textContent = tutIndex === TUTORIAL.length - 1 ? 'Começar a desenhar' : 'Próximo →';
    $('#tut-voltar').textContent = tutIndex === 0 && modalModo !== 'tutorial' ? '← Folha' : '← Voltar';
  }
  function aplicarFolhaEscolhida() {
    const [L, A] = dimsEscolhidas();
    const titulo = $('#modal-titulo-in').value.trim();
    if (titulo) estado.meta.titulo = titulo;
    trocarFormato(`${baseSel}-${orientSel}`, L, A, false);
    montarPainelFolha();
    desenhar();
  }
  function abrirModal(modo) {
    modalModo = modo || 'completo';
    baseSel = 'a4'; orientSel = 'paisagem';
    $$('#modal-formatos button').forEach(x => x.classList.toggle('ativo', x.dataset.base === 'a4'));
    $$('#modal-orient button').forEach(x => x.classList.toggle('ativo', x.dataset.orient === 'paisagem'));
    modal.hidden = false;
    if (modo === 'tutorial') { mostrarEtapa('tutorial'); tutIndex = 0; renderTutorial(); }
    else { mostrarEtapa('folha'); atualizarResultado(); }
  }
  function fecharModal() {
    modal.hidden = true;
    try { localStorage.setItem('croqui_visto', '1'); } catch (_) {}
  }

  $('#modal-formatos').addEventListener('click', e => {
    const b = e.target.closest('button[data-base]'); if (!b) return;
    baseSel = b.dataset.base;
    $$('#modal-formatos button').forEach(x => x.classList.toggle('ativo', x === b));
    atualizarResultado();
  });
  $('#modal-orient').addEventListener('click', e => {
    const b = e.target.closest('button[data-orient]'); if (!b) return;
    orientSel = b.dataset.orient;
    $$('#modal-orient button').forEach(x => x.classList.toggle('ativo', x === b));
    atualizarResultado();
  });
  $('#modal-avancar').addEventListener('click', () => {
    aplicarFolhaEscolhida();
    if (modalModo === 'folha') fecharModal();
    else { mostrarEtapa('tutorial'); tutIndex = 0; renderTutorial(); }
  });
  $('#modal-exemplo').addEventListener('click', () => { fecharModal(); carregarExemplo(); });
  $('#tut-proximo').addEventListener('click', () => {
    if (tutIndex === TUTORIAL.length - 1) fecharModal();
    else { tutIndex++; renderTutorial(); }
  });
  $('#tut-voltar').addEventListener('click', () => {
    if (tutIndex === 0) { if (modalModo === 'tutorial') fecharModal(); else mostrarEtapa('folha'); }
    else { tutIndex--; renderTutorial(); }
  });
  $('#bt-ajuda').addEventListener('click', () => abrirModal('tutorial'));

  /* ---------------- Início ---------------- */

  montarPaleta();
  aplicarFormato();
  montarPainelFolha();
  montarPainelCalque();
  desenhar();
  atualizarInspetor();
  aplicarZoom(0.72);
  window.addEventListener('resize', () => desenharSelecao());

  // primeira visita: abre o modal de novo projeto + tutorial
  let jaVisto = false;
  try { jaVisto = localStorage.getItem('croqui_visto') === '1'; } catch (_) {}
  if (!jaVisto) abrirModal('completo');

  // exposto para depuração no console
  window.CROQUI = {
    get estado() { return estado; },
    desenhar, adicionar, carregarExemplo
  };
})();

/* ============================================================
   relevos.js
   Traçados de perfil usados no corpo do croqui: quedas (rampada,
   vertical, negativo, desescalada), caminhada, caminhada em
   blocos e poço.

   São gerados por função, com ruído determinístico (seed), para
   que a mesma queda desenhe sempre igual e o croqui não mude
   sozinho ao recarregar.
   ============================================================ */

(function () {
  /** PRNG determinístico (mulberry32). */
  function rng(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Altura em pixels de cada faixa de queda. */
  const FAIXAS = [
    { id: '10-20', nome: '10–20 m', h: 90 },
    { id: '20-40', nome: '20–40 m', h: 150 },
    { id: '40-60', nome: '40–60 m', h: 215 },
    { id: '60-80', nome: '60–80 m', h: 290 }
  ];

  /** Comprimento em pixels de cada faixa de caminhada. */
  const DISTANCIAS = [
    { id: '50', nome: '50 m', w: 70 },
    { id: '100', nome: '100 m', w: 120 },
    { id: '200', nome: '200 m', w: 180 },
    { id: '300', nome: '+300 m', w: 250 }
  ];

  /** Larguras de poço. */
  const POCOS = [
    { id: '5', nome: '5 m', w: 34 },
    { id: '10', nome: '10 m', w: 60 },
    { id: '20', nome: '20 m', w: 92 },
    { id: '30', nome: '+30 m', w: 128 }
  ];

  /** Perfil de queda: devolve o atributo `d` de um path. */
  function queda(tipo, h, seed) {
    const r = rng(seed);
    const n = Math.max(4, Math.round(h / 26));
    const pts = [];

    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y = t * h;
      let x;
      if (tipo === 'rampada') {
        x = t * h * 0.52 + (r() - 0.5) * 7;
      } else if (tipo === 'vertical') {
        x = (r() - 0.5) * 9;
      } else if (tipo === 'negativo') {
        // barriga para fora e retorno: perfil negativo
        x = -Math.sin(t * Math.PI) * (h * 0.24) + (r() - 0.5) * 6;
      } else { // desescalada — quebras marcadas
        x = t * h * 0.34 + (i % 2 ? 9 : -9) + (r() - 0.5) * 5;
      }
      pts.push([x, y]);
    }

    if (tipo === 'desescalada') {
      return 'M' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');
    }
    // curva suave (Catmull-Rom simplificado em quadráticas)
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1], p1 = pts[i];
      const cx = (p0[0] + p1[0]) / 2, cy = (p0[1] + p1[1]) / 2;
      d += ` Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
    d += ` L${pts[pts.length - 1][0].toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)}`;
    return d;
  }

  /** Linha de caminhada: quase horizontal, levemente descendente. */
  function caminhada(w, seed) {
    const r = rng(seed);
    const n = Math.max(4, Math.round(w / 22));
    let d = 'M0 0';
    for (let i = 1; i <= n; i++) {
      const x = (i / n) * w;
      const y = (i / n) * 10 + (r() - 0.5) * 6;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  }

  /** Caminhada em blocos: a linha + pedras espalhadas sobre ela. */
  function caminhadaBlocos(w, seed) {
    const r = rng(seed + 99);
    const linha = caminhada(w, seed);
    let pedras = '';
    const qtd = Math.max(3, Math.round(w / 18));
    for (let i = 0; i < qtd; i++) {
      const x = (i / qtd) * w + r() * 8;
      const y = (i / qtd) * 10 - 3 - r() * 4;
      const rx = 5 + r() * 6, ry = 3.5 + r() * 3;
      pedras += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"/>`;
    }
    return { linha, pedras };
  }

  /** Traçado livre "adaptado ao croqui": recebe os pontos que o usuário puxou
      (em coordenadas locais) e devolve o `d` de um path já suavizado e com uma
      leve irregularidade determinística (seed), para simular solo/parede desenhada
      à mão. `rug` é a amplitude do ruído em px; 0 = linha limpa. */
  function tracado(pts, seed, rug) {
    if (!pts || pts.length < 2) return '';
    rug = rug || 0;
    const r = rng((seed || 1) >>> 0);
    const P = pts.map(p => [p[0], p[1]]);
    // desloca cada ponto interno na perpendicular à direção local (extremos ficam)
    for (let i = 1; i < P.length - 1; i++) {
      const a = pts[i - 1], b = pts[i + 1];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const L = Math.hypot(dx, dy) || 1;
      const amp = (r() * 2 - 1) * rug;
      P[i][0] += (-dy / L) * amp;
      P[i][1] += (dx / L) * amp;
    }
    // mesma suavização das quedas: quadráticas por ponto médio (Catmull-Rom simpl.)
    let d = `M${P[0][0].toFixed(1)} ${P[0][1].toFixed(1)}`;
    for (let i = 1; i < P.length; i++) {
      const p0 = P[i - 1], p1 = P[i];
      const cx = (p0[0] + p1[0]) / 2, cy = (p0[1] + p1[1]) / 2;
      d += ` Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    }
    const last = P[P.length - 1];
    d += ` L${last[0].toFixed(1)} ${last[1].toFixed(1)}`;
    return d;
  }

  window.RELEVOS = {
    FAIXAS, DISTANCIAS, POCOS,
    queda, caminhada, caminhadaBlocos, tracado,

    /** Monta o SVG interno de um item de relevo. */
    desenhar(item) {
      const seed = item.seed || 1;
      if (item.ref.startsWith('queda:')) {
        const [, tipo, faixaId] = item.ref.split(':');
        const faixa = FAIXAS.find(f => f.id === faixaId) || FAIXAS[0];
        return `<path d="${queda(tipo, faixa.h, seed)}"/>`;
      }
      if (item.ref.startsWith('caminhada-blocos:')) {
        const dist = DISTANCIAS.find(f => f.id === item.ref.split(':')[1]) || DISTANCIAS[0];
        const { linha, pedras } = caminhadaBlocos(dist.w, seed);
        return `<path d="${linha}"/>${pedras}`;
      }
      if (item.ref.startsWith('caminhada:')) {
        const dist = DISTANCIAS.find(f => f.id === item.ref.split(':')[1]) || DISTANCIAS[0];
        return `<path d="${caminhada(dist.w, seed)}"/>`;
      }
      if (item.ref.startsWith('poco:')) {
        const p = POCOS.find(f => f.id === item.ref.split(':')[1]) || POCOS[0];
        const w = p.w, h = w * 0.34;
        return `<path d="M0 0 H${w} a${w / 2} ${h} 0 0 1 -${w} 0 Z" class="agua"/>`;
      }
      return '';
    },

    /** Lista para a paleta. */
    catalogo() {
      const itens = [];
      ['rampada', 'vertical', 'negativo', 'desescalada'].forEach(tipo => {
        FAIXAS.forEach(f => itens.push({
          ref: `queda:${tipo}:${f.id}`,
          nome: `${tipo[0].toUpperCase() + tipo.slice(1)} ${f.nome}`,
          grupo: 'Quedas', vb: '-70 -20 340 340'
        }));
      });
      DISTANCIAS.forEach(d => itens.push({
        ref: `caminhada:${d.id}`, nome: `Caminhada ${d.nome}`, grupo: 'Caminhada', vb: '-10 -22 270 70'
      }));
      DISTANCIAS.forEach(d => itens.push({
        ref: `caminhada-blocos:${d.id}`, nome: `Blocos ${d.nome}`, grupo: 'Caminhada', vb: '-10 -22 270 70'
      }));
      POCOS.forEach(p => itens.push({
        ref: `poco:${p.id}`, nome: `Poço ${p.nome}`, grupo: 'Poços', vb: '-8 -8 145 66'
      }));
      return itens;
    }
  };
})();

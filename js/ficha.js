/* ============================================================
   ficha.js
   Elementos fixos da folha: título, ficha de informações mínimas,
   nota do croquista, legenda de risco e créditos.

   A ficha segue a lista de "Informações mínimas" do padrão CBC.
   ============================================================ */

(function () {
  /* Mini ícones da ficha, desenhados em caixa 24x24. */
  const MINI = {
    pin: `<path d="M12 2 c-4 0-7 3-7 7 0 5 7 13 7 13 s7-8 7-13 c0-4-3-7-7-7z" fill="currentColor"/><circle cx="12" cy="9" r="2.6" fill="#fff"/>`,
    carro: `<path d="M3 15 h18" stroke-width="1.6"/><path d="M5 15 q1-5 3-5 h8 q2 0 3 5" stroke-width="1.6" fill="none"/><circle cx="7.5" cy="17" r="1.8" fill="currentColor"/><circle cx="16.5" cy="17" r="1.8" fill="currentColor"/>`,
    rio: `<path d="M2 17 q6-1 9-6 q3-5 11-6" stroke-width="1.8" fill="none"/><path d="M11 11 q4 4 11 5" stroke-width="1.8" fill="none"/>`,
    regua: `<path d="M6 3 V21" stroke-width="1.6"/><path d="M3 3 H9 M3 21 H9" stroke-width="1.6"/><path d="M13 4 h8 v16 h-8z" stroke-width="1.4" fill="none"/><path d="M13 9 h4 M13 14 h4" stroke-width="1.4"/>`,
    estacao: `<path d="M3 3 h8 v8 h-8z M13 3 h8 v8 h-8z M3 13 h8 v8 h-8z M13 13 h8 v8 h-8z" stroke-width="1.3" fill="none"/><path d="M5 7 h4 M15 5 l4 4 M5 17 l4-4 M15 17 h4" stroke-width="1.2"/>`,
    corda: `<ellipse cx="12" cy="12" rx="9" ry="7" stroke-width="1.6" fill="none"/><ellipse cx="12" cy="12" rx="4" ry="3" stroke-width="1.4" fill="none"/>`,
    rocha: `<path d="M3 19 L10 8 L16 19z" stroke-width="1.5" fill="none"/><circle cx="18" cy="9" r="1.4" fill="currentColor"/><circle cx="21" cy="13" r="1.1" fill="currentColor"/><circle cx="17" cy="14" r="1" fill="currentColor"/>`,
    relogioDir: `<circle cx="8" cy="12" r="6" stroke-width="1.5" fill="none"/><path d="M8 8 V12 H11" stroke-width="1.4"/><path d="M16 12 h5" stroke-width="1.8"/><path d="M23 12 L18 9.5 V14.5z" fill="currentColor"/>`,
    relogioEsq: `<circle cx="8" cy="12" r="6" stroke-width="1.5" fill="none"/><path d="M8 8 V12 H11" stroke-width="1.4"/><path d="M22 12 h-4" stroke-width="1.8"/><path d="M15 12 L20 9.5 V14.5z" fill="currentColor"/>`,
    serraDir: `<path d="M1 16 L5 9 L9 16z M6 16 L10 11 L14 16z" fill="currentColor"/><path d="M16 12 h4" stroke-width="1.8"/><path d="M23 12 L18 9.5 V14.5z" fill="currentColor"/>`,
    serraBaixo: `<path d="M1 16 L5 9 L9 16z M6 16 L10 11 L14 16z" fill="currentColor"/><path d="M16 9 l4 4" stroke-width="1.8"/><path d="M22 16 L16 14 L20 10z" fill="currentColor"/>`,
    eCirc: `<circle cx="12" cy="12" r="8.5" stroke-width="1.8" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="currentColor" stroke="none">E</text>`,
    bussolaE: `<circle cx="9" cy="12" r="7" stroke-width="1.5" fill="none"/><path d="M6 15 L12 9" stroke-width="1.5"/><circle cx="12" cy="9" r="1.4" fill="currentColor"/><text x="19" y="16" text-anchor="middle" font-size="9" fill="currentColor" stroke="none">E</text>`,
    bussolaS: `<circle cx="9" cy="12" r="7" stroke-width="1.5" fill="none"/><path d="M6 15 L12 9" stroke-width="1.5"/><circle cx="12" cy="9" r="1.4" fill="currentColor"/><text x="19" y="16" text-anchor="middle" font-size="9" fill="currentColor" stroke="none">S</text>`
  };

  /* Campos da ficha, em duas colunas, na ordem do padrão. */
  const CAMPOS = [
    { k: 'cidade', rotulo: 'Cidade/Estado', icone: 'pin', col: 0, exemplo: 'Baldim - MG' },
    { k: 'afluente', rotulo: 'Afluente', icone: 'rio', col: 0, exemplo: 'Rio Claro' },
    { k: 'estacao', rotulo: 'Estação preferencial', icone: 'estacao', col: 0, exemplo: 'Outono' },
    { k: 'aproximacao', rotulo: 'Tempo e dist. de aproximação', icone: 'relogioDir', col: 0, exemplo: '1:30  2 km' },
    { k: 'progressao', rotulo: 'Tempo e dist. de progressão', icone: 'serraDir', col: 0, exemplo: '5 h  1,7 km' },
    { k: 'desnivel', rotulo: 'Desnível', icone: 'serraBaixo', col: 0, exemplo: '210 m' },
    { k: 'retorno', rotulo: 'Tempo e dist. de retorno', icone: 'relogioEsq', col: 0, exemplo: '1 h  2 km' },
    { k: 'carros', rotulo: 'Qtd. de carros na logística', icone: 'carro', col: 1, exemplo: 'x1' },
    { k: 'maiorRapel', rotulo: 'Maior rapel', icone: 'regua', col: 1, exemplo: '60 m' },
    { k: 'cordas', rotulo: 'Sugestão de cordas', icone: 'corda', col: 1, exemplo: '3x60' },
    { k: 'rocha', rotulo: 'Tipo de rocha', icone: 'rocha', col: 1, exemplo: 'Arenito' },
    { k: 'latEstacionamento', rotulo: 'Lat/long estacionamento', icone: 'eCirc', col: 1, exemplo: '-19.2801, -43.9612' },
    { k: 'latEntrada', rotulo: 'Lat/long entrada', icone: 'bussolaE', col: 1, exemplo: '-19.2833, -43.9570' },
    { k: 'latSaida', rotulo: 'Lat/long saída', icone: 'bussolaS', col: 1, exemplo: '-19.2902, -43.9488' }
  ];

  const esc = s => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  /** Tabela da ficha, ancorada no canto inferior esquerdo. */
  function tabela(ficha, x, y) {
    const linhaH = 24, colA = 178, colB = 208;
    const esquerda = CAMPOS.filter(c => c.col === 0);
    const direita = CAMPOS.filter(c => c.col === 1);
    const n = Math.max(esquerda.length, direita.length);
    let out = `<g class="ficha" transform="translate(${x},${y})">`;

    for (let i = 0; i < n; i++) {
      const yy = i * linhaH;
      [esquerda[i], direita[i]].forEach((campo, ci) => {
        if (!campo) return;
        const cx = ci === 0 ? 0 : colA;
        const cw = ci === 0 ? colA : colB;
        const valor = ficha[campo.k] || '';
        out += `<rect x="${cx}" y="${yy}" width="${cw}" height="${linhaH}" fill="none" stroke="#000" stroke-width="1"/>`;
        out += `<g transform="translate(${cx + 5},${yy + 3})" stroke="#000" fill="none" stroke-linecap="round">${MINI[campo.icone] || ''}</g>`;
        out += `<text x="${cx + 34}" y="${yy + 17}" font-size="13" fill="#000">${esc(valor)}</text>`;
      });
    }
    out += `</g>`;
    return out;
  }

  /** Legenda dos itens de risco presentes no croqui. */
  function legenda(idsUsados, x, y) {
    const usados = window.SIMBOLOS_RISCO.filter(s => idsUsados.includes(s.id));
    if (!usados.length) return '';
    let out = `<g class="legenda" transform="translate(${x},${y})">`;
    out += `<text x="0" y="0" font-size="13" font-weight="700" fill="#000">Legenda — itens de risco</text>`;
    usados.forEach((s, i) => {
      const yy = 18 + i * 26;
      out += `<g transform="translate(0,${yy - 13}) scale(0.24)" stroke="#000" fill="none" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${window.svgSimbolo(s, 0).replace('{{label}}', 'R')}</g>`;
      out += `<text x="34" y="${yy + 4}" font-size="13" fill="#000">${esc(s.nome)}</text>`;
      out += `<text x="27" y="${yy + 4}" font-size="15" fill="#000">*</text>`;
    });
    out += `</g>`;
    return out;
  }

  /** Legenda de cores em uso (água + cores atribuídas), em linha, no rodapé. */
  function legendaCores(cores, x, y) {
    if (!cores || !cores.length) return '';
    let out = `<g class="legenda-cores" transform="translate(${x},${y})">`;
    out += `<text x="0" y="0" font-size="12" font-weight="700" fill="#000">Cores:</text>`;
    let cx = 46;
    cores.forEach(c => {
      out += `<circle cx="${cx}" cy="-4" r="6" fill="${c.v}"/>`;
      out += `<text x="${cx + 12}" y="0" font-size="12" fill="#000">${esc(c.nome)}</text>`;
      cx += 12 + String(c.nome).length * 6.6 + 22;
    });
    out += `</g>`;
    return out;
  }

  /** Camada fixa da folha: título, nota, ficha, créditos e legenda. */
  function camadaFolha(estado, largura, altura, idsRisco, coresUsadas) {
    const m = estado.meta, f = estado.ficha;
    let out = `<g class="folha" font-family="Arial, Helvetica, sans-serif">`;

    out += `<text x="${largura / 2}" y="52" text-anchor="middle" font-size="34" fill="#000">${esc(m.titulo)}</text>`;

    // a nota fica logo acima da tabela, seja qual for a altura da folha
    const topoTabela = altura - 40 - 7 * 24;
    if (m.nota) {
      const linhas = String(m.nota).split('\n');
      linhas.forEach((ln, i) => {
        const y = topoTabela - 26 - (linhas.length - 1 - i) * 17;
        out += `<text x="40" y="${y}" font-size="13" fill="#000">${esc(ln)}</text>`;
      });
    }

    out += tabela(f, 40, topoTabela);

    if (m.croquista) {
      out += `<text x="${largura / 2}" y="${altura - 26}" text-anchor="middle" font-size="16" fill="#000">${esc(m.croquista)}</text>`;
    }
    if (m.abertura) {
      out += `<text x="${largura - 40}" y="${altura - 190}" text-anchor="end" font-size="15" fill="#000">Abertura em ${esc(m.abertura)}</text>`;
    }
    (m.equipe || []).forEach((nome, i) => {
      out += `<text x="${largura - 40}" y="${altura - 168 + i * 20}" text-anchor="end" font-size="15" fill="#000">${esc(nome)}</text>`;
    });

    out += legenda(idsRisco, largura - 260, altura - 90);
    out += legendaCores(coresUsadas, 40, altura - 12);
    out += `</g>`;
    return out;
  }

  window.FICHA = { CAMPOS, MINI, tabela, legenda, legendaCores, camadaFolha };
})();

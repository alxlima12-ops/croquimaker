/* ============================================================
   simbologia.js
   Catálogo de símbolos do padrão de croquis de canionismo (CBC).
   Base: "Simbologia para montagem de croqui" — arte e conteúdo de
   Carlos Zaith, adaptação de Sanner Moraes e Pedro Ferraz.

   Cada símbolo é desenhado em uma caixa de 100x100 unidades.
   O traço usa currentColor, então o símbolo herda a cor do item.
   `{{label}}` é substituído pelo rótulo do item na hora de desenhar.

   ATENÇÃO: os traçados abaixo são reconstruções vetoriais das
   figuras do PDF, não os arquivos originais. Antes de publicar,
   confira símbolo a símbolo com a prancha oficial.
   ============================================================ */

window.CATEGORIAS = [
  { id: 'progressao', nome: 'Progressão' },
  { id: 'manobras', nome: 'Manobras' },
  { id: 'ancoragem', nome: 'Ancoragens e referências' },
  { id: 'hidrologia', nome: 'Hidrologia' },
  { id: 'terreno', nome: 'Terreno' },
  { id: 'alerta', nome: 'Alertas' },
  { id: 'logistica', nome: 'Logística' }
];

window.SIMBOLOS = [
  /* ---------------- Progressão ---------------- */
  // BACKLOG-3 (item 3): alongamento anisotrópico. Estes símbolos NÃO são um `svg`
  // fixo — têm `alongavel:true` e `render(comprimento)`, que devolve o traçado com
  // o topo/dobra parado, a haste reta esticada por `comprimento` (unidades da
  // caixa 100x100) e a seta de tamanho fixo empurrada para baixo. É o alongamento
  // do croqui: some com o `esc` (que continua dando zoom uniforme). Ver README.
  {
    id: 'rapel-seco', nome: 'Rapel seco', cat: 'progressao', alongavel: true,
    render(c) { c = c || 0;
      return `<path d="M50 10 V${64 + c}"/><path d="M50 ${90 + c} L38 ${62 + c} H62 Z" class="fill"/>`;
    }
  },
  {
    id: 'rapel-molhado', nome: 'Rapel molhado', cat: 'progressao', alongavel: true,
    render(c) { c = c || 0;
      return `<path d="M50 8 q13 8 0 16 q-13 8 0 16 q13 8 0 16 V${62 + c}"/><path d="M50 ${90 + c} L38 ${62 + c} H62 Z" class="fill"/>`;
    }
  },
  {
    id: 'rapel-guiado', nome: 'Rapel guiado', cat: 'progressao',
    svg: `<path d="M16 26 L70 63"/><path d="M22 44 L40 14"/><path d="M88 76 L64 72 L75 55 Z" class="fill"/>`
  },
  {
    id: 'desescalada', nome: 'Desescalada', cat: 'progressao', alongavel: true,
    render(c) { c = c || 0;
      return `<path d="M18 14 H42 V42 H66 V${64 + c}"/><path d="M66 ${90 + c} L55 ${64 + c} H77 Z" class="fill"/>`;
    }
  },
  {
    id: 'escalada', nome: 'Escalada', cat: 'progressao', alongavel: true,
    render(c) { c = c || 0;
      return `<path d="M66 ${86 + c} V58 H42 V30 H18 V36"/><path d="M18 8 L7 34 H29 Z" class="fill"/>`;
    }
  },
  {
    id: 'salto', nome: 'Salto', cat: 'progressao', alongavel: true,
    render(c) { c = c || 0;
      return `<path d="M26 74 V44 a16 16 0 0 1 32 0 V${58 + c}"/><path d="M58 ${86 + c} L47 ${60 + c} H69 Z" class="fill"/>`;
    }
  },
  {
    id: 'toboga', nome: 'Tobogã', cat: 'progressao',
    svg: `<path d="M10 60 q22 -30 40 -12 q18 18 40 -14"/>`
  },
  {
    id: 'oposicao', nome: 'Oposição', cat: 'progressao', risco: true,
    svg: `<path d="M26 50 H74"/><path d="M8 50 L30 40 V60 Z" class="fill"/><path d="M92 50 L70 40 V60 Z" class="fill"/><path d="M50 22 V78"/>`
  },
  {
    id: 'remontar-corda', nome: 'Remontar p/ corda', cat: 'progressao', risco: true,
    svg: `<path d="M50 90 V32"/><path d="M50 8 L39 34 H61 Z" class="fill"/><circle cx="50" cy="60" r="6" class="fill"/>`
  },
  {
    id: 'percurso-nao-descrito', nome: 'Percurso não descrito', cat: 'progressao',
    svg: `<path d="M16 78 L52 20"/><path d="M44 80 L80 22"/><path d="M22 56 L40 62"/><path d="M52 58 L70 64"/>`
  },

  /* ---------------- Manobras ---------------- */
  {
    id: 'corrimao', nome: 'Corrimão', cat: 'manobras',
    svg: `<path d="M14 34 q36 42 72 0"/><circle cx="14" cy="34" r="6" class="fill"/><circle cx="86" cy="34" r="6" class="fill"/>`
  },
  {
    id: 'fracionamento', nome: 'Fracionamento', cat: 'manobras',
    svg: `<path d="M50 10 V32"/><circle cx="50" cy="40" r="8"/><path d="M50 48 V64"/><path d="M50 90 L39 64 H61 Z" class="fill"/>`
  },
  {
    id: 'desvio', nome: 'Desvio', cat: 'manobras',
    svg: `<path d="M22 12 L50 46"/><path d="M78 18 L50 46"/><circle cx="78" cy="18" r="6" class="fill"/><path d="M50 46 V64"/><path d="M50 90 L39 64 H61 Z" class="fill"/>`
  },
  {
    id: 'tirolesa', nome: 'Tirolesa', cat: 'manobras', risco: true,
    svg: `<path d="M12 28 H88"/><path d="M12 28 L54 68 L88 30"/><circle cx="34" cy="49" r="6" class="fill"/>`
  },
  {
    id: 'travessia-corda', nome: 'Travessia c/ corda', cat: 'manobras', risco: true,
    svg: `<circle cx="16" cy="26" r="6" class="fill"/><path d="M16 26 q30 46 54 26" class="tracejado"/><path d="M88 40 L64 44 L72 62 Z" class="fill"/>`
  },
  {
    id: 'pendulo', nome: 'Pêndulo', cat: 'manobras', risco: true,
    svg: `<circle cx="30" cy="12" r="6" class="fill"/><path d="M30 12 V58"/><path d="M30 88 L19 62 H41 Z" class="fill"/><path d="M32 60 q30 22 44 -12" class="tracejado"/>`
  },

  /* ---------------- Ancoragens e referências ---------------- */
  {
    id: 'md', nome: 'Margem direita (MD)', cat: 'ancoragem',
    svg: `<text x="50" y="66" text-anchor="middle" font-size="40" class="texto">MD</text>`
  },
  {
    id: 'me', nome: 'Margem esquerda (ME)', cat: 'ancoragem',
    svg: `<text x="50" y="66" text-anchor="middle" font-size="40" class="texto">ME</text>`
  },
  {
    id: 'aa', nome: 'Ancoragem em árvore (AA)', cat: 'ancoragem',
    svg: `<text x="50" y="66" text-anchor="middle" font-size="40" class="texto">AA</text>`
  },
  {
    id: 'ar', nome: 'Ancoragem em rocha (AR)', cat: 'ancoragem',
    svg: `<text x="50" y="66" text-anchor="middle" font-size="40" class="texto">AR</text>`
  },
  {
    id: 'pitons', nome: 'Pitons', cat: 'ancoragem',
    svg: `<path d="M10 68 L38 26 L44 48 Z" class="fill"/><path d="M48 68 L76 26 L82 48 Z" class="fill"/>`
  },
  {
    id: 'ancoragens-fixas', nome: 'Ancoragens fixas', cat: 'ancoragem',
    svg: `<path d="M14 34 L42 62 M42 34 L14 62"/><path d="M58 34 L86 62 M86 34 L58 62"/>`
  },
  {
    id: 'passo-chave', nome: 'Passo chave', cat: 'ancoragem',
    svg: `<circle cx="26" cy="50" r="14"/><circle cx="26" cy="50" r="4.5" class="fill"/><path d="M40 50 H86"/><path d="M70 50 V68"/><path d="M86 50 V68"/>`
  },
  {
    id: 'rapel-id', nome: 'Identificação do rapel', cat: 'ancoragem', rotulo: 'R1',
    svg: `<circle cx="50" cy="50" r="34"/><text x="50" y="64" text-anchor="middle" font-size="34" class="texto">{{label}}</text>`
  },

  /* ---------------- Hidrologia ---------------- */
  {
    id: 'afluente', nome: 'Afluente', cat: 'hidrologia',
    svg: `<path d="M8 72 q24 -6 38 -24 q14 -18 46 -22"/><path d="M46 48 q14 12 40 16"/>`
  },
  {
    id: 'ressurgencia', nome: 'Ressurgência', cat: 'hidrologia',
    svg: `<path d="M26 36 a14 14 0 1 0 8 26 q22 8 38 -2"/><path d="M92 54 L68 50 L72 68 Z" class="fill"/>`
  },
  {
    id: 'sumidouro', nome: 'Sumidouro', cat: 'hidrologia', risco: true,
    svg: `<path d="M4 26 q20 12 34 8"/><path d="M54 44 L34 34 L30 50 Z" class="fill"/><path d="M90 70 a15 15 0 1 1 -15 -15"/><path d="M82 70 a7 7 0 1 0 -7 -7"/>`
  },
  {
    id: 'tramo', nome: 'Tramo (trecho inundado)', cat: 'hidrologia',
    svg: `<path d="M10 40 q18 -18 34 -2 q16 16 46 -8"/><path d="M10 62 q18 -18 34 -2 q16 16 46 -8"/>`
  },
  {
    id: 'sifao', nome: 'Sifão', cat: 'hidrologia', risco: true,
    svg: `<path d="M26 34 a19 19 0 1 1 28 20 V66"/><circle cx="54" cy="84" r="6" class="fill"/>`
  },
  {
    id: 'refluxo', nome: 'Refluxo', cat: 'hidrologia', risco: true,
    svg: `<path d="M6 30 Q24 30 40.0 52.0"/><path d="M40.0 52.0 L41.2 45.9 L44.0 40.4 L48.0 36.0 L52.9 32.7 L58.4 30.9 L64.0 30.6 L69.4 31.8 L74.2 34.2 L78.2 37.8 L81.0 42.2 L82.5 47.0 L82.8 52.0 L81.7 56.7 L79.5 60.9 L76.3 64.3 L72.5 66.7 L68.3 68.0 L64.0 68.1 L59.9 67.2 L56.4 65.2 L53.5 62.5 L51.6 59.2 L50.5 55.6 L50.5 52.0 L51.4 48.6 L53.1 45.7 L55.4 43.4 L58.1 41.8 L61.1 41.1 L64.0 41.1 L66.7 41.9 L69.0 43.3 L70.8 45.2 L71.9 47.4 L72.4 49.8 L72.2 52.0 L71.5 54.0 L70.4 55.7 L68.9 56.9 L67.2 57.6 L65.6 57.9 L64.0 57.6 L62.7 57.0 L61.6 56.1 L61.0 55.0 L60.6 53.9 L60.7 52.9 L61.0 52.0"/>`
  },
  {
    id: 'contra-corrente', nome: 'Contra corrente', cat: 'hidrologia', risco: true,
    svg: `<path d="M18 32 q28 -14 50 2"/><path d="M84 42 L62 30 L58 46 Z" class="fill"/><path d="M82 68 q-28 14 -50 -2"/><path d="M16 58 L38 70 L42 54 Z" class="fill"/>`
  },
  {
    id: 'redemoinho', nome: 'Redemoinho', cat: 'hidrologia', risco: true,
    svg: `<path d="M30.0 30.0 L31.0 24.9 L33.3 20.4 L36.6 16.6 L40.7 13.9 L45.3 12.4 L50.0 12.1 L54.5 13.1 L58.6 15.1 L61.9 18.1 L64.3 21.8 L65.6 25.8 L65.8 30.0 L64.9 34.0 L63.0 37.5 L60.4 40.4 L57.2 42.4 L53.6 43.5 L50.0 43.6 L46.6 42.8 L43.5 41.2 L41.1 38.9 L39.4 36.1 L38.5 33.1 L38.5 30.0 L39.2 27.1 L40.7 24.6 L42.6 22.6 L45.0 21.3 L47.5 20.6 L50.0 20.6 L52.3 21.3 L54.3 22.5 L55.9 24.1 L56.9 26.0 L57.3 28.0 L57.2 30.0 L56.7 31.8 L55.7 33.3 L54.4 34.4 L52.9 35.1 L51.4 35.3 L50.0 35.1 L48.8 34.6 L47.8 33.8 L47.1 32.9 L46.8 31.9 L46.8 30.9 L47.0 30.0"/><path d="M50 54 V66"/><path d="M50 92 L39 66 H61 Z" class="fill"/>`
  },
  {
    id: 'marmita', nome: 'Marmita', cat: 'hidrologia', risco: true,
    svg: `<path d="M8 40 q10 -11 20 -2 q10 9 21 0 q10 -9 21 2 q-31 36 -62 0 Z" class="fill"/>`
  },
  {
    id: 'drosagem', nome: 'Drosagem', cat: 'hidrologia', risco: true,
    svg: `<path d="M4 38 L24 46 L4 54 Z" class="fill"/><path d="M16.0 46.0 L17.5 41.4 L20.7 37.2 L25.4 33.7 L31.3 30.9 L38.1 29.1 L45.2 28.2 L52.4 28.4 L59.1 29.5 L65.1 31.5 L70.0 34.2 L73.7 37.5 L75.9 41.1 L76.6 44.8 L75.7 48.4 L73.6 51.7 L70.2 54.6 L65.8 56.9 L60.8 58.5 L55.4 59.3 L50.0 59.3 L44.8 58.6 L40.2 57.3 L36.4 55.4 L33.5 53.1 L31.7 50.5 L31.0 47.8 L31.4 45.1 L32.8 42.7 L35.0 40.6 L38.0 38.9 L41.4 37.8 L45.1 37.1 L48.8 37.0 L52.3 37.4 L55.4 38.3 L58.0 39.5 L59.9 41.0 L61.1 42.7 L61.6 44.4 L61.3 46.0 L60.5 47.5 L59.1 48.7 L57.3 49.7 L55.3 50.3 L53.3 50.6 L51.2 50.6 L49.4 50.3 L47.9 49.8"/>`
  },
  {
    id: 'encorbatado', nome: 'Encorbatado', cat: 'hidrologia', risco: true,
    svg: `<path d="M8 18 L40 41"/><path d="M56 52 L37 48 L46 35 Z" class="fill"/><path d="M8 82 L40 59"/><path d="M56 48 L46 65 L37 52 Z" class="fill"/>`
  },
  {
    id: 'poco', nome: 'Poço', cat: 'hidrologia',
    svg: `<path d="M10 40 H90 a40 28 0 0 1 -80 0 Z" style="fill:#b8b8b8"/>`
  },

  /* ---------------- Terreno ---------------- */
  {
    id: 'caverna', nome: 'Caverna', cat: 'terreno',
    svg: `<path d="M14 80 H34 q0 -16 -12 -28 q-8 -8 -8 -18 q0 -20 36 -20 q36 0 36 20 q0 10 -8 18 q-12 12 -12 28 h20"/>`
  },
  {
    id: 'arco', nome: 'Arco', cat: 'terreno',
    svg: `<path d="M14 34 H86"/><path d="M28 78 a22 26 0 0 1 44 0"/>`
  },
  {
    id: 'estreitos', nome: 'Estreitos', cat: 'terreno',
    svg: `<path d="M40 14 V86"/><path d="M60 14 V86"/><path d="M34 50 L14 41 V59 Z" class="fill"/><path d="M66 50 L86 41 V59 Z" class="fill"/>`
  },
  {
    id: 'escuros', nome: 'Escuros', cat: 'terreno',
    svg: `<path d="M38 16 h24 v20 h20 v24 h-20 v20 h-24 v-20 h-20 v-24 h20 z" class="fill"/>`
  },
  {
    id: 'blocos', nome: 'Blocos', cat: 'terreno',
    svg: `<path d="M8 64 q2 -18 20 -16 q8 -14 26 -6 q20 -8 26 10 q12 8 4 14 Z"/><path d="M28 48 q10 8 26 6"/>`
  },
  {
    id: 'caos', nome: 'Caos', cat: 'terreno',
    svg: `<path d="M14 24 L52 76 M52 24 L14 76"/><path d="M48 24 L86 76 M86 24 L48 76"/><path d="M8 50 H92"/>`
  },
  {
    id: 'arvores', nome: 'Árvores', cat: 'terreno',
    svg: `<path d="M32 50 q-16 -6 -8 -20 q-6 -16 12 -18 q8 -12 24 -4 q20 -4 20 14 q12 10 -2 22 q-6 12 -20 8 q-14 8 -26 -2 Z"/><path d="M50 44 V88"/><path d="M50 62 L34 50 M50 70 L66 56"/>`
  },
  {
    id: 'barragem', nome: 'Barragem', cat: 'terreno',
    svg: `<path d="M20 28 L88 18"/><path d="M16 44 L84 34"/><path d="M12 60 L80 50"/><path d="M8 76 L76 66"/>`
  },

  /* ---------------- Alertas ---------------- */
  {
    id: 'atencao', nome: 'Atenção', cat: 'alerta',
    svg: `<path d="M50 12 L92 84 H8 Z"/><path d="M50 40 V62"/><circle cx="50" cy="72" r="4.5" class="fill"/>`
  },
  {
    id: 'abrasao-forte', nome: 'Abrasão forte', cat: 'alerta',
    svg: `<path d="M32 12 L66 62 L54 72 Z" class="fill"/><path d="M54 72 L44 88"/>`
  },
  {
    id: 'zona-perigo', nome: 'Zona de PERIGO', cat: 'alerta',
    svg: `<path d="M50 12 q-30 0 -30 26 q0 12 10 18 v8 h40 v-8 q10 -6 10 -18 q0 -26 -30 -26 Z"/><circle cx="38" cy="42" r="6" class="fill"/><circle cx="62" cy="42" r="6" class="fill"/><path d="M50 56 v8"/><path d="M34 72 V88 M42 72 V90 M50 72 V88 M58 72 V90 M66 72 V88"/>`
  },

  /* ---------------- Logística ---------------- */
  {
    id: 'estacionamento', nome: 'Estacionamento para veículos', cat: 'logistica',
    svg: `<circle cx="50" cy="50" r="34" stroke-width="8"/><text x="50" y="65" text-anchor="middle" font-size="40" font-weight="700" class="texto">E</text>`
  },
  {
    id: 'acampamento', nome: 'Acampamento, bivaque', cat: 'logistica',
    svg: `<path d="M50 20 L86 76 H14 Z"/><path d="M26 60 H74"/>`
  },
  {
    id: 'via-de-escape', nome: 'Via de escape', cat: 'logistica',
    svg: `<path d="M10 86 L72 30"/><path d="M92 16 L66 22 L78 38 Z" class="fill"/>`
  },
  {
    id: 'trilha', nome: 'Trilha', cat: 'logistica',
    svg: `<path d="M10 84 L90 20" class="tracejado"/>`
  },
  {
    id: 'inicio-canyon', nome: 'Início do canyon', cat: 'logistica',
    svg: `<path d="M18 12 V56 M18 12 H62 M18 34 H52 M18 56 H62"/><path d="M40 56 V66"/><path d="M40 92 L29 66 H51 Z" class="fill"/>`
  },
  {
    id: 'final-canyon', nome: 'Final do canyon', cat: 'logistica',
    svg: `<path d="M60 46 H30"/><path d="M8 46 L32 36 V56 Z" class="fill"/><text x="80" y="62" text-anchor="middle" font-size="40" class="texto">S</text>`
  },
  {
    id: 'continua-pagina', nome: 'Continua em outra página', cat: 'logistica',
    svg: `<path d="M30 80 L56 20"/><path d="M52 80 L78 20"/>`
  }
];

/** Traçado interno de um símbolo. Símbolos alongáveis têm `render(comprimento)`;
    os demais têm `svg` fixo. `comprimento` em unidades da caixa (padrão 0). */
window.svgSimbolo = (s, comprimento) => s && s.render ? s.render(comprimento || 0) : (s ? s.svg : '');

/** Índice por id, para lookup rápido. */
window.SIMBOLO_POR_ID = Object.fromEntries(window.SIMBOLOS.map(s => [s.id, s]));

/** Itens de risco: obrigatoriamente descritos na legenda do croqui. */
window.SIMBOLOS_RISCO = window.SIMBOLOS.filter(s => s.risco);

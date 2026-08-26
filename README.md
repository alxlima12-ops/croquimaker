# Montador de croquis de canionismo

Base de um editor web para montar croquis de cânions usando a simbologia padrão
da CBC — a mesma do arquivo *Simbologia para montagem de croqui* (arte e conteúdo
de Carlos Zaith, adaptação de Sanner Moraes e Pedro Ferraz).

A ideia é tirar o croqui do PowerPoint: em vez de arrastar caixinhas soltas numa
folha A4, o croquista monta a folha num editor que já conhece os símbolos, sabe
quais itens são de risco e monta a legenda e a ficha de informações mínimas
sozinho.

## Como rodar

Não tem build nem dependência. Abra o `index.html` no navegador, ou sirva a pasta:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

Clique em **Carregar exemplo** para ver uma folha montada.

## O que já funciona

- **Paleta com 54 símbolos** divididos em progressão, manobras, ancoragens,
  hidrologia, terreno, alertas e logística. Clicar insere no centro; arrastar
  solta no ponto exato.
- **Relevos paramétricos**: quedas (rampada, vertical, negativo, desescalada) nas
  faixas de 10–20 até 60–80 m, caminhada e caminhada em blocos de 50 a +300 m, e
  poços de 5 a +30 m. São gerados por função, com ruído determinístico — a mesma
  queda desenha sempre igual.
- **Edição direta**: arrastar move, a alça de cima gira (Shift trava de 15 em 15
  graus), o canto inferior direito redimensiona. Setas ajustam de 1 em 1 px,
  Shift+setas de 10 em 10, Delete apaga, Ctrl+D duplica.
- **Numeração automática dos rapéis**: cada símbolo de identificação entra como
  R1, R2, R3… e o rótulo pode ser trocado à mão.
- **Legenda de risco automática**: os 13 itens marcados com `*` no padrão (sifão,
  refluxo, marmita, drosagem, encorbatado, redemoinho, contra corrente,
  sumidouro, tirolesa, travessia c/ corda, pêndulo, oposição, remontar p/ corda)
  entram na legenda impressa assim que aparecem na folha.
- **Ficha de informações mínimas** com os 14 campos do padrão, mais título,
  croquista, data de abertura, equipe e observações da folha.
- **Formato da folha** configurável: A4, A3 e A2 em paisagem ou retrato, carta,
  ou medidas livres em milímetros. Ao trocar, o desenho pode ser reposicionado
  proporcionalmente (caixa marcada por padrão) ou ficar onde está.
- **Calque**: carregue uma foto ou digitalização de um croqui antigo, ajuste
  opacidade, tamanho e posição, e desenhe por cima. O calque fica só na tela —
  não entra no SVG, no PNG, no PDF nem no `.json` salvo.
- **Exportação** em SVG (vetorial, para editar depois), PNG 2x, PDF em A4
  paisagem e `.json` do projeto, que pode ser reaberto no editor.

## Arquitetura

```
index.html          folha SVG + esqueleto da interface
build.py            gera o croqui-canionismo.html de arquivo único
css/app.css         interface
js/simbologia.js    catálogo dos símbolos (SVG em caixa 100x100)
js/relevos.js       geradores de queda, caminhada e poço
js/ficha.js         ficha de informações mínimas, legenda e elementos fixos
js/editor.js        estado, desenho, interação, importação e exportação
```

Sem framework e sem bundler, de propósito: a base precisa abrir de um pendrive
em campo. Os scripts são carregados como scripts globais, não como módulos ES,
justamente para funcionar via `file://`.

O croqui inteiro é **um único SVG** cujo `viewBox` acompanha o formato escolhido.
A unidade é o pixel a 96 dpi, então 297 mm dão exatamente 1123 px e o A4 paisagem
fica em 1123 x 794. A folha se divide em cinco camadas:

| Camada | Conteúdo | Exporta? |
|---|---|---|
| `#grade` | malha de apoio e margem | não (`.so-tela`) |
| `#camada-calque` | imagem de referência | não (`.so-tela`) |
| `#camada-folha` | título, ficha, nota, créditos, legenda | sim |
| `#camada-itens` | símbolos, relevos e textos | sim |
| `#camada-ui` | caixa de seleção e alças | não (`.so-tela`) |

Exportar é clonar o SVG, remover tudo que tem `.so-tela` e serializar. O PNG sai
do mesmo string desenhado num canvas.

O PDF sai por `window.print()` com uma folha de estilo gerada em tempo de
execução (`#estilo-impressao`), que declara `@page` com as medidas em milímetros
do formato escolhido e esconde toda a interface. Sai
vetorial, sem biblioteca nenhuma. No diálogo do navegador, escolha *Salvar como
PDF*, mantenha a escala em 100% e desmarque cabeçalhos e rodapés.

### Distribuição

`python3 build.py` embute CSS e JS no `index.html` e gera
`croqui-canionismo.html`, que funciona sozinho — bom para mandar por WhatsApp ou
guardar num pendrive. Para hospedar, publique a pasta inteira: é site estático,
sem servidor.

### Modelo de dados

```jsonc
{
  "versao": 1,
  "meta":  { "titulo": "", "croquista": "", "abertura": "", "equipe": [], "nota": "" },
  "ficha": { "cidade": "", "maiorRapel": "", "latEntrada": "" /* … 14 campos */ },
  "folha": { "formato": "a4-paisagem", "larguraMm": 297, "alturaMm": 210 },
  "itens": [
    {
      "id": "i1",
      "tipo": "simbolo",        // simbolo | relevo | texto
      "ref": "rapel-molhado",   // id do símbolo, ou "queda:vertical:40-60"
      "x": 474, "y": 392,
      "esc": 0.55,              // escala
      "rot": 0,                 // graus
      "flip": false,            // espelhamento horizontal
      "label": "R1",            // rótulo (rapel) ou conteúdo (texto)
      "comprimento": 0,         // alongamento anisotrópico, só símbolos alongáveis
      "pts": [[0,0]],           // pontos locais, só no tipo "tracado" (linha livre)
      "rugosidade": 3,          // irregularidade do tracado, só no tipo "tracado"
      "seed": 4242              // semente do traçado (relevos e tracado)
    }
  ]
}
```

Esse JSON é o contrato entre o editor e qualquer coisa que venha depois — banco
de dados, biblioteca de croquis, app offline. Vale versionar o campo `versao`
desde já.

## O que ainda não tem

Em ordem do que eu atacaria primeiro:

1. **Desfazer/refazer.** Hoje um Delete sem querer custa caro. Um histórico de
   estados no `editor.js` resolve em pouca coisa.
2. **Traçado livre do perfil — pontos de controle editáveis.** Já existe a
   ferramenta "Desenhar solo" (ver "Feito nesta rodada"): puxa a linha à mão e
   vira um objeto. Falta poder reeditar os pontos depois de criado (hoje só
   move/escala/gira/apaga o traço inteiro).
3. **Reposicionamento inteligente ao trocar de formato.** Hoje a escala é
   proporcional e cega: virar uma folha paisagem em retrato estica o traçado e
   pode aproximar demais os elementos. O certo seria reflowar o perfil.
4. **Encaixe entre segmentos.** Fazer o fim de uma queda grudar no começo da
   caminhada seguinte, para o perfil não ficar picotado.
5. **Persistência.** `localStorage` para autosalvamento e, depois, um backend com
   biblioteca de croquis publicados.
6. **Segunda folha**, ligada pelo símbolo *continua em outra página*.
7. **Leitura assistida de croqui antigo.** Hoje o calque é manual. O passo
   seguinte seria mandar a imagem para um modelo de visão e receber de volta o
   `itens[]` já preenchido, para o croquista só corrigir. Precisa de backend com
   chave de API — não dá para fazer só no navegador sem expor a chave.
8. **Conferência da simbologia.** Os SVGs foram redesenhados a partir das figuras
   do PDF, não são os arquivos originais. Antes de qualquer publicação, vale
   passar símbolo a símbolo com quem mantém o padrão.
9. **Acessibilidade e toque.** Já há suporte a tablet (gestos de pinça/pan e
   gavetas — ver "Feito nesta rodada"). Falta validar num tablet físico de campo
   e melhorar acessibilidade por teclado/leitor de tela.

## Backlog — retorno de uso em campo

Registrado a partir do primeiro uso real. Em ordem sugerida de ataque.

### Feito nesta rodada
- **Correção do travamento (crítico).** Um toque "fantasma" (pointerup de toque
  perdido — palma na tela de um laptop) fazia todo clique de mouse virar "2 dedos"
  e travava seleção/arraste/giro/escala/along. Agora gestos de dois dedos valem
  SÓ para toque; mouse/caneta nunca entram nesse caminho e limpam ponteiros
  fantasmas a cada clique. Ver `pointerType === 'touch'` no `pointerdown`.
- **Prévia da folha ao vivo.** No modal de novo projeto, trocar formato/orientação
  já muda a folha atrás (o cartão encosta à esquerda para deixar ver). `previewFolha`.
- **Tour anotado no lugar do passo-a-passo.** Ao abrir (ou no "?"), rótulos
  apontam cada região de uma vez — paleta, painéis, ferramentas (texto/desenhar
  solo) e menu — sem clicar por slides. Ver `#tour`, `posicionarTour`, `REGIOES`.
- **Alça de alongar movida para a lateral.** Virou uma setinha no meio da lateral
  esquerda (longe da alça de escala, que encavalava), apontando o eixo em que
  estica. Ver `data-alca="alongar"` em `desenharSelecao`.
- **Tela de início (novo projeto + tutorial).** Na primeira visita abre um modal
  para escolher o formato da folha (A4/A3/A2/carta + orientação, com título
  opcional) e, na sequência, 3–4 passos de como usar. Fica guardado em
  `localStorage` (`croqui_visto`), então não reaparece a cada refresh. "Nova
  folha" reabre a escolha de formato; o botão **?** no cabeçalho reabre o
  tutorial. Ver o bloco "Modal de início" em `js/editor.js` e `#modal-inicio`.
- **Alongar direto no item.** Símbolos de progressão alongáveis ganharam uma
  **alça na base** (além das de girar e redimensionar) — arraste para esticar a
  haste, no eixo do item (respeita a rotação). É o mesmo `comprimento` do
  inspetor. Ver `data-alca="alongar"` em `desenharSelecao`/`pointerdown`.
- **Suporte a tablet (toque + gestos + gavetas).** O foco é desktop + tablet
  (celular só para ver/compartilhar, não editar). Pinça = zoom, dois dedos =
  arrastar a folha (`pointers`/`gesto` no `js/editor.js`, `touch-action:none` na
  folha). Em telas ≤1024px a paleta e os painéis viram **gavetas** que deslizam
  sobre o canvas (botões "☰ Símbolos" / "Editar ⚙"; fundo escuro fecha). Uma
  rede de segurança no `window` limpa ponteiros perdidos. Desktop inalterado.
- **Categorias da paleta recolhíveis.** Clicar no cabeçalho abre/fecha a
  categoria (seta ▾ indica o estado); durante uma busca as recolhidas voltam a
  mostrar os resultados. Ver `.grupo.fechado` no `css/app.css` e o handler de
  clique em `h3` no `js/editor.js`.
- **Texto não rouba mais o clique das linhas.** Um `<text>` é clicável na CAIXA
  inteira (maior que as letras), e nenhum `pointer-events` restringe isso; então
  a caixa invisível roubava linhas/símbolos vizinhos. Agora `itemNoPonto` escolhe
  o alvo: mantém o que já está selecionado (sticky) e, senão, prefere
  linhas/símbolos a texto. Clicar numa linha pega a linha; texto isolado ainda
  seleciona normalmente. Resolve o antigo `BACKLOG-1`.
- **Alça de girar maior + "Desenhar solo" auto-desliga.** O alvo da alça de
  rotação foi ampliado (some menos o giro por quase-erro). E ao soltar um traço
  livre, a ferramenta se desmarca sozinha e o cursor volta ao normal (o traço
  novo fica selecionado para ajustar a rugosidade).
- **Selecionar ficou fácil (folga de clique).** Símbolos, relevos e traçados são
  linhas com `fill:none`; antes só o traço fino registrava o clique. Agora cada um
  ganha uma cópia invisível `.hit` (traço grosso transparente) que dá ~9 px de
  folga ao redor da linha, sem mudar o desenho nem a caixa de seleção. Ver
  `mioloItem` e a regra `.hit` no `<style>` do `index.html`.
- **Arrastar não vira mais "escalar".** A alça de escala tinha um alvo de 36 px
  centrado no canto que cobria o corpo de itens pequenos — o clique para mover
  acabava redimensionando. Agora o alvo é menor e projetado para fora do canto,
  deixando o interior livre para mover. Ver `desenharSelecao` em `js/editor.js`.
- **Ferramenta "Desenhar solo" (linha livre).** Um botão na barra liga o modo de
  desenho: você puxa a linha do solo/parede à mão e, ao soltar, ela vira um objeto
  (mover/escalar/girar/apagar) já suavizado, com uma leve irregularidade ajustável
  ("Rugosidade" no inspetor) no mesmo traço do croqui. Novo `tipo:'tracado'`;
  gerador em `RELEVOS.tracado`. Esc sai do modo.
- **Alongamento anisotrópico dos elementos de progressão (item 3).** Rapel seco,
  rapel molhado, salto, desescalada e escalada deixaram de ser um `svg` fixo e
  passaram a ter `alongavel:true` e `render(comprimento)` (`js/simbologia.js`): a
  dobra/topo fica parada, a haste reta estica por `comprimento` e a seta, de
  tamanho fixo, desce junto. É o alongamento do croqui — some com o `esc`, que
  continua dando zoom uniforme. O item ganhou o campo `comprimento` e o inspetor
  um controle "Alongamento" (só aparece nos símbolos alongáveis). Ver
  `window.svgSimbolo` e o handler de `#in-comp` em `js/editor.js`.
- **Correção: a seta sumia ao alongar/editar.** O `redesenharMiolo` remontava o
  item passando o SVG por um `<div>` HTML temporário; o parser HTML não
  auto-fecha `<path/>`, então a seta (`.fill`) virava filha da haste e não
  renderizava até um `desenhar()` completo. Agora o miolo é gerado por
  `mioloItem(it)` e montado direto no SVG (`g.innerHTML = mioloItem(it)`), no
  contexto certo. Também consertava o rótulo de símbolos como o R1 (círculo +
  texto) ao digitar.
- **Ferramenta de texto voltou a funcionar.** O painel do item era reconstruído a
  cada tecla digitada, o que roubava o foco do campo — impossível escrever. Agora
  o inspetor só é remontado quando muda a seleção; digitar redesenha apenas o
  miolo do item. Ver `redesenharMiolo` e `sincronizarInspetor` em `js/editor.js`.
- **Traço de espessura constante ao escalar (item 4).** Símbolos e relevos usam
  `vector-effect: non-scaling-stroke`. Crescer o elemento agora só o aumenta; a
  linha mantém a espessura. Ver as regras `.simbolo` e `.relevo` no `<style>` do
  `index.html`. *Ressalva:* áreas preenchidas (a ponta da seta, o poço) ainda
  escalam — é o que o item 3 vai tratar.
- **Alças de girar/escalar com alvo de clique ampliado (parte do item 1).** Cada
  alça ganhou um alvo invisível de raio maior (`.alca-alvo`), para o clique não
  cair no elemento de baixo por três pixels de erro.

### A fazer
1. **Inserção de imagens no croqui (item 5).** Diferente do calque (que é só
   referência de tela): imagens que entram no croqui final e são exportadas —
   logotipos de equipe, QR codes para Wikiloc, fotos de ancoragem. Vira um novo
   `tipo: 'imagem'` no modelo de itens, com o `src` em data URL. Atenção: isso
   infla o `.json` e o SVG; convém avisar o usuário ou oferecer redução. Marcado
   como `BACKLOG-5` em `js/editor.js`, junto ao catálogo de tipos de item.

### Como o alongamento funciona (feito)

Os símbolos de progressão que esticam deixaram de ser um `svg` fixo: têm
`alongavel: true` e um `render(comprimento)` que devolve o caminho com as âncoras
que não deformam. `comprimento` está em unidades da caixa 100×100:

```js
// em vez de  svg: `<path .../>`
{
  id: 'rapel-molhado', cat: 'progressao', alongavel: true,
  render(c) { c = c || 0;
    return `<path d="M50 8 q13 8 0 16 q-13 8 0 16 q13 8 0 16 V${62 + c}"/>` +   // dobra fixa + haste que estica
           `<path d="M50 ${90 + c} L38 ${62 + c} H62 Z" class="fill"/>`;        // seta de tamanho fixo, desce junto
  }
}
```

O item tem o campo `comprimento` além de `esc`, e o inspetor mostra o controle
"Alongamento" só quando o símbolo é `alongavel`. O `esc` continua fazendo o zoom
uniforme; o `comprimento` faz o alongamento do croqui — somam-se. Quem lê o
traçado é `window.svgSimbolo(s, comprimento)` (em `js/simbologia.js`), usado no
desenho, na miniatura da paleta e na legenda. Alongáveis hoje: rapel seco, rapel
molhado, salto, desescalada e escalada.

## Créditos

A simbologia é da Confederação Brasileira de Canionismo. Este repositório é só a
ferramenta para desenhá-la.

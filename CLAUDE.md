# CLAUDE.md — contexto do projeto

Editor web para montar croquis de canionismo com a simbologia padrão da CBC
(arte e conteúdo de Carlos Zaith; adaptação de Sanner Moraes e Pedro Ferraz).
Tira o croqui do PowerPoint: em vez de arrastar caixas soltas numa folha A4, o
croquista monta a folha num editor que já conhece os símbolos, sabe quais itens
são de risco e monta legenda e ficha sozinho.

## Regra de ouro

**Sem framework, sem bundler, sem dependência de runtime.** É site estático puro,
scripts globais (não módulos ES), para abrir de `file://` num pendrive em campo.
Não introduza React, imports ES, npm em produção, nem chamadas de rede. Se for
propor algo assim, pergunte antes.

## Rodar

```bash
python3 -m http.server 8000     # http://localhost:8000  (usa index.html + css/ + js/)
```

Não há passo de build para desenvolver. O `croqui-canionismo.html` é um artefato
gerado, de arquivo único.

## Estrutura e fluxo de edição

```
index.html          folha SVG (o <style> do SVG vive aqui) + esqueleto da UI
css/app.css         interface (fora da folha)
js/simbologia.js    catálogo dos 54 símbolos (SVG em caixa 100x100, traço = currentColor)
js/relevos.js       geradores de queda/caminhada/poço (paramétricos, com seed)
js/ficha.js         ficha de informações mínimas, legenda de risco, elementos fixos
js/editor.js        estado, desenho, interação, import/export  ← núcleo
build.py            embute css+js no index.html → croqui-canionismo.html
```

**Sempre que editar `index.html`, `css/` ou `js/`, rode `python3 build.py`** para
regenerar o arquivo único. É fácil esquecer; o único-arquivo é o que o usuário
final abre.

O croqui é **um único SVG** cujo `viewBox` acompanha o formato da folha (px a
96 dpi: 297 mm = 1123 px). Cinco camadas, na ordem de empilhamento:

| Camada | Conteúdo | Exporta? |
|---|---|---|
| `#grade` | malha e margem | não (`.so-tela`) |
| `#camada-calque` | imagem de referência | não (`.so-tela`) |
| `#camada-folha` | título, ficha, nota, créditos, legenda | sim |
| `#camada-itens` | símbolos, relevos, textos | sim |
| `#camada-ui` | caixa de seleção e alças | não (`.so-tela`) |

Exportar = clonar o SVG, remover tudo `.so-tela`, serializar. PNG desenha esse
string num canvas; PDF usa `window.print()` com `#estilo-impressao` (gerado em
`aplicarFormato`); JSON é o estado sem o calque.

## Ciclo de desenho — o ponto que mais causou bug

- `desenhar()` reconstrói folha + itens. Custa caro; **não** chame a cada tecla.
- `redesenharMiolo(it)` troca só o conteúdo de um item — use ao digitar/editar.
- `redesenharItem(it)` troca só o `transform` — use ao arrastar/escalar/girar.
- `atualizarInspetor()` remonta o painel do item. Só quando **muda a seleção**.
  Remontar durante a digitação rouba o foco do campo (foi a causa do texto
  "não funcionar"). `selecionar()` já chama isso na hora certa.
- `sincronizarInspetor(it)` espelha valores no painel sem remontá-lo (arraste).

Cada símbolo/relevo/traçado é desenhado **duas vezes** em `mioloItem`: uma cópia
`.hit` (traço grosso transparente, `pointer-events:stroke`) só para dar folga de
clique ao redor da linha fina, e a cópia visível. `getBBox` ignora o traço, então
a caixa de seleção não incha. Ferramenta "Desenhar solo": `modoDesenho`/`desenhando`
capturam o traço no `pointerdown/move/up` do svg; `finalizarTracado` vira o item
`tracado`. A alça de escala fica projetada para fora do canto (era um alvo de 36px
centrado no canto que cobria itens pequenos e transformava arraste em escala).

## Modelo de dados (contrato de save/load)

```jsonc
{
  "versao": 1,
  "meta":  { "titulo","croquista","abertura","equipe":[],"nota" },
  "ficha": { /* 14 campos das informações mínimas */ },
  "folha": { "formato":"a4-paisagem","larguraMm":297,"alturaMm":210 },
  "itens": [
    { "id","tipo","ref","x","y","esc","rot","flip","label","comprimento","pts","rugosidade","seed" }
  ]
}
```

`comprimento` (padrão 0) é o alongamento anisotrópico; só símbolos `alongavel`
o usam. `pts` (array de `[x,y]` locais) e `rugosidade` só existem no tipo
`tracado` (linha de solo/parede desenhada à mão livre; render por
`RELEVOS.tracado(pts, seed, rugosidade)`). Campos aditivos e opcionais — `.json`
antigos abrem normalmente. `tipo` ∈ `simbolo | relevo | texto | tracado`
(em breve `imagem`, ver BACKLOG-5).
`ref` é o id do símbolo, ou `"queda:vertical:40-60"`, `"poco:20"` etc.
O **calque não é serializado** (é só referência de tela).
Versione `versao` ao mudar o formato do estado.

## Backlog priorizado

Ver `README.md` (seção "Backlog — retorno de uso em campo") para o detalhe. Os
pontos de entrada estão marcados no código — busque por `BACKLOG-`:

- `BACKLOG-1` **resolvido**: texto roubava o clique (é clicável na caixa inteira).
  `itemNoPonto` (em `js/editor.js`, usado no `pointerdown`) escolhe o alvo via
  `elementsFromPoint`: mantém o selecionado (sticky) e prefere linhas/símbolos a
  texto. A alça de girar também foi ampliada.
- `BACKLOG-5` (`js/editor.js`, `markupItem`): novo `tipo:'imagem'` que entra no
  export (logos, QR de Wikiloc, fotos), diferente do calque.

`BACKLOG-3` (alongamento anisotrópico da progressão) **está feito**: símbolos
`alongavel:true` têm `render(comprimento)` em `js/simbologia.js` (topo/dobra
fixos + haste que estica + seta de tamanho fixo). O item ganhou o campo
`comprimento`; leia o traçado por `window.svgSimbolo(s, comprimento)`, nunca por
`s.svg` direto (símbolos alongáveis não têm `svg`). Detalhe no README.

## Verificação antes de commitar

Não há suíte formal. O mínimo:

```bash
for f in js/*.js; do node --check "$f"; done   # sintaxe
python3 build.py                                # arquivo único atualiza sem erro
```

Testes de fumaça foram feitos com jsdom (carregar exemplo, inserir símbolo,
digitar texto sem perder foco, trocar formato, exportar). jsdom não tem geometria
SVG real (`getBBox`, CTM), então precisa de stubs; ele **não** valida
posicionamento visual — para isso, renderize o SVG exportado (ex.: cairosvg) e
olhe. Sempre confira a folha renderizada depois de mexer em símbolo ou layout.

## Cuidados de conteúdo

- Os SVGs dos símbolos são **reconstruções** a partir do PDF, não os originais.
  Antes de publicar, conferir símbolo a símbolo com quem mantém o padrão CBC.
- 13 itens são "de risco" (`risco: true` em `simbologia.js`) e entram na legenda
  automaticamente. Não quebre esse encadeamento ao mexer no catálogo.
- Créditos da simbologia à CBC devem permanecer visíveis (rodapé da paleta).

# Importar Tablatura de Imagem/PDF — Design Spec

Data: 2026-09-09
Status: Aprovado para implementação

## 1. Visão Geral

Bloco C de três, e o último. O aluno sobe uma imagem ou um PDF de um
exercício que achou na internet ou no YouTube, o app lê a tablatura e
monta as posições no braço. O resultado passa por uma tela de revisão e
vira um exercício salvo na biblioteca criada no bloco B.

A extração roda **inteiramente no navegador**: sem backend, sem chave de
API e sem custo por upload. O motor é o Tesseract.js, e o PDF é
rasterizado pelo pdf.js antes de qualquer OCR.

**A pauta é ignorada.** A fonte das posições é a tablatura: as seis
linhas com números de casa. Isso não é uma simplificação — é o que torna
o problema tratável, porque o número na tablatura já é a casa e a linha
já é a corda, enquanto a pauta exigiria decidir a digitação.

Fora de escopo: ritmo e duração vindos do arquivo (toda nota importada
entra na figura rítmica corrente), acordes com notas simultâneas na
mesma coluna, bends, hammer-ons, slides e demais articulações, e
tablatura manuscrita.

## 1.1 Limites Medidos

Medição com o pipeline real contra folhas de exemplo com gabarito, em
`exemplos/`:

- **Tablatura gravada e densa: 100%.** Uma folha de 27 notas em três
  sistemas, e uma de 9 notas com casas de dois dígitos, saem completas e
  na ordem certa, com a pauta de cinco linhas ignorada.
- **Sistema esparso: 100%,** depois da segmentação de dígitos descrita na
  seção 8.1. Antes dela um sistema com três ou quatro números soltos era
  lido como vazio.
- **Foto inclinada: falha na detecção.** Uma folha girada 1,6° já não
  produz linhas horizontais escuras o bastante, e nenhum sistema é
  encontrado. Corrigir isso exige endireitar a imagem antes, por exemplo
  com transformada de Hough.

Nos dois casos de falha o app diz o que houve, e as mensagens são
diferentes: não achar as linhas é um arquivo errado, e achar as linhas
sem ler os números é o mesmo arquivo que precisa de melhor digitalização.

## 2. O Problema Central

Uma folha típica tem **duas pautas empilhadas**: a notação musical, com
cinco linhas, e a tablatura, com seis. Um OCR ingênuo leria números das
duas regiões, além de marcações de quiáltera ("3"), dinâmica ("mf") e
números de compasso — todos dígitos plausíveis em posições erradas.

A defesa é geométrica, não textual: primeiro achamos onde estão as linhas
horizontais, agrupamos em sistemas, e **só aceitamos grupos de exatamente
seis linhas igualmente espaçadas**. Um grupo de cinco é a pauta e é
descartado. Depois disso, todo dígito fora da faixa vertical de um
sistema de seis linhas é ignorado — o que elimina de uma vez as
quiálteras acima da pauta e a dinâmica abaixo.

## 3. Arquitetura

Três camadas, com a regra de que tudo que pode errar é puro e testável:

```
  arquivo (File)
      │
      ▼
  [adaptador] rasterize.ts ──── PDF → canvas (pdf.js), imagem → canvas
      │  ImageBitmap/canvas
      ▼
  [puro] grayscale.ts ───────── canvas → GrayImage { data, width, height }
      │
      ├──▶ [puro] staff-detection.ts ── GrayImage → TabSystem[]
      │
  [adaptador] ocr.ts ────────── canvas → OcrToken[] (Tesseract.js)
      │
      ▼
  [puro] tab-parser.ts ──────── (OcrToken[], TabSystem[]) → FretPosition[]
      │
      ▼
  tela de revisão → biblioteca do aluno (bloco B)
```

Os dois adaptadores (`rasterize.ts`, `ocr.ts`) não têm lógica de decisão:
um devolve pixels, o outro devolve caixas com texto. Nos testes eles são
mockados, e é por isso que a suíte não precisa de OCR real para provar
que o parser está correto.

## 4. Tipos

```ts
export interface GrayImage {
  data: Uint8ClampedArray;   // um byte por pixel, 0 = preto
  width: number;
  height: number;
}

/** Um sistema de tablatura: seis linhas, da corda 1 (topo) à corda 6. */
export interface TabSystem {
  lineYs: number[];          // exatamente 6, em ordem crescente de y
  top: number;               // limite superior da faixa de captura
  bottom: number;            // limite inferior da faixa de captura
}

export interface OcrToken {
  text: string;
  x: number;                 // centro horizontal
  y: number;                 // centro vertical
}
```

## 5. Detecção das Linhas (`staff-detection.ts`)

`detectTabSystems(image: GrayImage): TabSystem[]`, em quatro passos
puros:

1. **Perfil de escuridão por linha.** Para cada y, a fração de pixels
   abaixo do limiar de tom. Uma linha de pauta é escura ao longo de quase
   toda a largura; texto e notas não são.
2. **Linhas candidatas.** Toda faixa com fração acima de `0.5` vira uma
   candidata, e faixas adjacentes são fundidas no seu y central — uma
   linha impressa tem 2 ou 3 pixels de altura e não deve virar três
   linhas.
3. **Agrupamento em sistemas.** Candidatas consecutivas cujo espaçamento
   é aproximadamente constante (tolerância de 35% do espaçamento mediano)
   formam um grupo. A tolerância é generosa de propósito: PDFs
   rasterizados e fotos deformam o espaçamento.
4. **Filtro dos seis.** Só grupos de exatamente seis linhas viram
   `TabSystem`. Cinco é a pauta e é descartado. `top` e `bottom` recebem
   meio espaçamento de folga além da primeira e da última linha, para
   caber números que o gravador centraliza um pouco acima ou abaixo.

## 6. Mapeamento dos Dígitos (`tab-parser.ts`)

`positionsFromTokens(tokens: OcrToken[], systems: TabSystem[]): FretPosition[]`

- Descarta todo token cujo texto não seja inteiro de 0 a 24. Isso remove
  "mf", "3" de quiáltera fora da faixa, letras e ruído. O teto de 24 é o
  número de casas de um braço comum.
- Descarta todo token que não caia dentro do `top`/`bottom` de algum
  sistema.
- Dentro do sistema, a corda é a linha mais próxima em y: a primeira
  linha é a corda 1 (a mais aguda, no topo), a sexta é a corda 6. Se a
  distância até a linha mais próxima passar de 35% do espaçamento, o
  token é descartado como ruído entre linhas. O limite precisa ficar
  abaixo de 50%: entre linhas igualmente espaçadas, a maior distância
  possível até a mais próxima é meio espaçamento, então qualquer valor de
  50% para cima aceitaria tudo e a checagem nunca rejeitaria nada.
- A ordem final é: sistema de cima para baixo, e dentro dele x crescente.
  É a ordem de leitura da tablatura, e é a ordem em que as notas serão
  tocadas.
- Dois tokens no mesmo sistema com x praticamente igual (dentro de 40% do
  espaçamento) são um acorde. Como acordes estão fora de escopo, o de
  corda mais grave vem primeiro e ambos entram na sequência — soam como
  um arpejo rápido, o que é honesto e não perde informação.

## 7. Rasterização (`rasterize.ts`)

`rasterizeFile(file: File): Promise<HTMLCanvasElement[]>`

- Imagem (`image/*`): desenhada em um canvas no tamanho natural.
- PDF (`application/pdf`): cada página renderizada pelo pdf.js em escala
  2, teto de 5 páginas — um exercício não passa disso, e o limite protege
  contra um PDF de livro inteiro travar o navegador.
- Qualquer outro tipo rejeita com uma mensagem em português.

pdf.js e Tesseract.js entram por `import()` dinâmico, para que nenhum dos
dois pese no bundle inicial de quem nunca importar um arquivo.

## 8. OCR (`ocr.ts`)

> **Revisado duas vezes após medição.** A primeira versão entregava a página
> inteira ao Tesseract, e isso perdia a maioria dos números: uma folha de 27
> notas rendia 11 e uma de 9 notas em três sistemas rendia zero. Recortar um
> sistema por vez levou a folha densa a 27 de 27, mas o caso esparso seguia em
> zero. O que resolveu os dois foi segmentar os dígitos (seção 8.1).

## 8.1 Segmentação dos Dígitos

O OCR nunca recebe uma página nem um sistema: recebe **um número de casa por
vez**, já recortado. `findDigitBoxes` localiza cada um antes, e é puro:

1. **Apagar as linhas.** Cada linha atravessa a página inteira e soldaria
   todos os dígitos dela num borrão só. Apagar as fileiras inteiras, porém,
   cortaria ao meio qualquer dígito que a linha cruza — então um pixel na
   fileira da linha sobrevive quando há tinta logo acima ou logo abaixo, no
   mesmo x, porque essa tinta é de um símbolo e não da linha.
2. **Rotular componentes conexos** na tinta restante, com preenchimento
   iterativo (recursão estoura em manchas grandes, como uma barra de compasso).
3. **Filtrar por tamanho** plausível de dígito, em proporção ao espaçamento
   entre cordas. É isso que descarta poeira e barras de compasso.
4. **Fundir vizinhos**: duas manchas lado a lado, com sobreposição vertical e
   separadas por menos de 35% do espaçamento, são os dois algarismos de um
   número como "12".

Cada caixa é então recortada e **normalizada para 110 px de altura**. Um
multiplicador fixo não serve: o PDF é rasterizado em 2×, então o mesmo dígito
impresso chega com o dobro da altura, e a escala que serve para uma origem
estoura a outra. Medindo, o multiplicador fixo deixava a folha densa em 93% ou
o PDF em 38%, conforme o valor escolhido; a normalização por altura põe os
dois em 100%.

O modo de segmentação do Tesseract é `SINGLE_WORD`. `SPARSE_TEXT` procura
texto espalhado por uma página e devolve vazio para um caractere isolado —
com ele, só os números de dois dígitos eram lidos. `SINGLE_CHAR` truncaria
justamente esses.

## 8.2 Configuração do OCR


`recognizeDigits(canvas: HTMLCanvasElement): Promise<OcrToken[]>`

Tesseract configurado com a lista branca `0123456789` e segmentação de
página esparsa, que é o modo certo para números soltos em uma folha e não
para prosa. Cada palavra reconhecida vira um `OcrToken` com o centro da
sua caixa.

O Tesseract baixa o worker e os dados de idioma na primeira execução.
Isso exige rede na primeira importação, e a tela de revisão mostra
progresso enquanto acontece.

## 9. Fluxo e Interface

Uma aba nova, **"Importar"**, ao lado de Prática e Exercícios:

1. **Soltar o arquivo.** Área de arrastar-e-soltar que também abre o
   seletor ao clique. Aceita imagem e PDF.
2. **Processando.** Barra de progresso com o passo corrente
   ("Rasterizando", "Lendo a tablatura"), porque o OCR leva segundos.
3. **Revisão.** As posições extraídas aparecem na linha do tempo do bloco
   A e em uma lista de "corda × casa". Cada nota pode ser removida.
   Nenhuma nota é editada nesta versão: remover cobre o erro comum (ruído
   virou nota) e editar exigiria um seletor por nota.
4. **Salvar.** Campo de nome e botão, reaproveitando
   `saveCurrentSelection` do bloco B. Salvar leva o aluno para a aba
   Exercícios com o novo exercício ativo.

**Quando nada é encontrado**, a tela diz o que provavelmente aconteceu —
nenhum sistema de seis linhas na página — e sugere uma imagem mais nítida
ou com a tablatura mais reta. Um erro silencioso aqui é pior do que um
"não consegui": o aluno precisa saber que o problema é a imagem.

## 10. Testes

O parser e a detecção são puros, então recebem a maior parte dos testes,
com imagens sintéticas montadas em código:

- `staff-detection.test.ts` — seis linhas viram um sistema; cinco linhas
  são descartadas; uma pauta de cinco acima de uma tablatura de seis
  devolve só a tablatura; duas tablaturas empilhadas viram dois sistemas;
  uma linha grossa de três pixels não vira três linhas.
- `tab-parser.test.ts` — dígito na linha vira a corda certa; ordem por x;
  ordem por sistema; token fora da faixa descartado; texto não numérico
  descartado; casa acima de 24 descartada; número de dois dígitos
  preservado; token entre linhas descartado; acorde vira duas notas.
- `rasterize.test.ts` — tipo não suportado é rejeitado com mensagem.
- `ImportPanel.test.tsx` — estados de vazio, processando, sem resultado,
  revisão com remoção de nota, e salvar delegando ao store do bloco B.

Os adaptadores de OCR e PDF são mockados em todos os testes de
componente. A suíte nunca executa OCR de verdade.

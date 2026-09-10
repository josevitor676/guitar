# Aba Acordes — Design Spec

Data: 2026-09-10
Status: Aprovado para implementação

## 1. Visão Geral

Uma aba nova, ao lado de Importar. O aluno monta um acorde clicando no
braço, o app **identifica** qual acorde é e mostra **outras formas de
tocar o mesmo acorde** ao longo do braço, incluindo as inversões.

O braço fica **na horizontal**, com as cordas em linhas, como no resto do
app. A referência que originou o pedido mostra o braço em pé; manter dois
padrões de leitura no mesmo produto obrigaria o aluno a reaprender o
desenho a cada aba.

Fora de escopo: sugestão de progressões ou de acordes que combinam com o
atual, digitação de dedos numerada, e afinações alternativas.

## 2. O Que Falta no Modelo

Uma sequência de notas e um acorde são coisas diferentes, e o modelo atual
só sabe representar a primeira:

- **Corda solta.** `FretPosition` já aceita casa 0, mas a grade nunca a
  desenha e o catálogo a proíbe. Um acorde sem cordas soltas exclui quase
  todo acorde aberto.
- **Corda abafada.** Não existe. Num acorde, não tocar uma corda é uma
  decisão, diferente de simplesmente não ter nota ali.

Então um acorde é um tipo próprio, e não uma lista de posições:

```ts
export type StringPlay = number | 'muted';   // número é a casa; 0 é solta
export type ChordVoicing = Record<StringNumber, StringPlay>;
```

Toda corda tem um estado, sempre. Isso evita o caso ambíguo de uma corda
ausente da lista: ela está solta ou abafada?

## 3. Identificação

`identifyChord(voicing, tuning)` devolve o acorde, ou `null` quando o que
está no braço não forma nenhum.

1. As cordas não abafadas viram notas; delas se extrai o conjunto de
   classes de altura e a **nota mais grave**, que é o baixo.
2. Para cada candidato a fundamental presente no conjunto, e para cada
   qualidade conhecida, compara-se o conjunto de intervalos.
3. Vence a interpretação que explica **todas** as notas; entre empates,
   ganha a que tem a fundamental no baixo. Se o baixo não for a
   fundamental, o acorde é uma inversão e se escreve `G/D`.

A fundamental precisa estar presente. Um violão não toca acordes com
fundamental omitida com frequência suficiente para justificar a ambiguidade
que essa permissão criaria — `E-G-B-D` seria tanto `Em7` quanto `G6`.

## 4. Sugestões

`suggestVoicings(root, quality, tuning)` procura formas tocáveis ao longo
do braço. Para cada janela de quatro casas a partir da pestana:

- Por corda, os candidatos são as casas da janela cuja nota pertence ao
  acorde, mais a corda solta se ela servir, mais abafada.
- Descarta-se o que não contém fundamental, terça (ou a quarta/segunda de
  um sus) e quinta.
- Descarta-se o que tem corda abafada **entre** cordas tocadas em mais de
  um ponto: abafar no meio é possível, mas é digitação avançada e polui
  a lista.
- Ordena-se por: fundamental no baixo primeiro, menos cordas abafadas,
  posição mais baixa no braço, e forma mais compacta.

A busca é barata porque os candidatos por corda já saem filtrados pelo
acorde — são dois ou três por corda, não vinte.

## 5. Interface

- **Montagem**: o braço horizontal, do jeito do app. Clicar numa casa põe
  a nota naquela corda e tira a anterior — uma corda toca uma nota só.
- **Solta e abafada**: uma coluna à esquerda do braço, antes da casa 1,
  com um botão por corda que alterna solta (○) e abafada (✕).
- **Resultado**: o nome do acorde em destaque, e as inversões quando
  existirem.
- **Sugestões**: uma grade de diagramas pequenos, cada um um braço
  horizontal em miniatura, com a casa inicial indicada quando não começa
  na pestana.
- **Ouvir**: um botão toca o acorde arpejado de cima para baixo, que é
  como se confere um acorde no instrumento.

## 6. Testes

- `chord-identification.test.ts` — maior, menor, sétima, sus, dim, aug;
  inversão vira `G/D`; corda abafada ignorada; braço vazio devolve nulo;
  duas notas não formam acorde.
- `chord-voicing-generator.test.ts` — toda sugestão contém as notas do
  acorde; nenhuma passa de quatro casas de abertura; a forma aberta
  aparece para acordes que a têm; sugestões não se repetem.
- `ChordPanel.test.tsx` — clicar monta, o nome aparece, alternar solta e
  abafada, e escolher uma sugestão a carrega no braço.

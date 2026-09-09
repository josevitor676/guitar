# Redesign Visual + Vista Linha do Tempo — Design Spec

Data: 2026-09-09
Status: Aprovado para planejamento de implementação

## 1. Visão Geral

Este spec cobre o **bloco A** de um trabalho maior dividido em três
blocos independentes:

- **A — Redesign (este documento):** nova linguagem visual, inspirada no
  app Daily Fret, e uma segunda forma de visualizar a sequência tocada:
  a linha do tempo com playhead.
- **B — Exercício do aluno (spec futuro):** montar, nomear e salvar
  exercícios próprios; catálogo deixa de ser estático.
- **C — Importar arquivo (spec futuro):** upload de imagem/PDF de
  tablatura, OCR no navegador, parser geométrico das 6 linhas de tab,
  tela de revisão, e o resultado vira um exercício salvo (depende de B).

O bloco A não adiciona persistência nova, não adiciona pontuação/XP e não
toca no motor de áudio. Ele troca a paleta, extrai uma camada de
primitivos de UI, elimina uma duplicação grande em `App.tsx`, e adiciona
o componente de linha do tempo com um alternador de vista.

Fora de escopo, explicitamente: XP, streak de dias, histórico de sessão,
tablatura ou pauta desenhadas na tela, e qualquer mudança em
`src/audio/**`.

## 2. Sistema Visual

### 2.1 Tokens de cor

Os nomes de token existentes são preservados e apenas os valores mudam,
de modo que `bg-card`, `text-accent`, `bg-surface` etc. continuam válidos
em todos os componentes. A paleta sai do cinza neutro atual para um preto
quente com acento laranja.

| token | valor atual | valor novo | uso |
| --- | --- | --- | --- |
| `body` | `#1b1b1b` | `#0E0C0B` | fundo da página |
| `card` | `#1b1b1b` | `#17130F` | cartão do fretboard |
| `surface` | `#262626` | `#241D18` | chips, selects, botões secundários |
| `accent` | `#ebebeb` | `#FF7A18` | playhead, nota tocando, botão primário |
| `accent-soft` | — | `#C25A20` | hover/pressed do botão primário |
| `accent-dim` | — | `rgba(255,122,24,0.16)` | halo da nota ativa, trilha de progresso |
| `text-primary` | `#fafafa` | `#FAFAFA` | inalterado |
| `text-secondary` | `#a1a1a1` | `#A6968B` | secundário, levemente quente |

Como `accent` é o token usado hoje pelo marcador destacado, pelo botão
Começar e pela aba ativa, a troca de valor já leva o laranja a todos
esses lugares sem edição pontual.

### 2.2 Forma

- **Raio:** cartões usam `rounded-2xl` (16px); chips, botões de controle
  e marcadores de nota usam `rounded-full`. O `rounded` de 2px atual sai.
- **Bordas:** `border-white/10` passa a `border-white/[0.06]`. Na
  referência a separação entre casas é quase imperceptível; quem separa
  os elementos é o contraste entre `body` e `card`.
- **Marcador de nota:** círculo com fundo `body`, borda `white/20` e
  rótulo em `text-primary`. A nota que está tocando recebe preenchimento
  `accent`, texto `body` e um halo externo `accent-dim` (via
  `ring-4 ring-accent-dim`).

### 2.3 Formato de tela

Desktop primeiro e responsivo. O layout largo com abas no topo é mantido;
o que vem da referência é a estética (cartão escuro arredondado, círculos
maiores, barra de controles inferior com botões redondos). Em telas
estreitas o cartão ocupa a largura toda e a barra de controles quebra em
duas linhas.

## 3. Camada de Primitivos de UI

Novo diretório `src/components/ui/`, com quatro componentes sem estado,
cada um só de apresentação:

- **`Card`** — superfície `bg-card`, `rounded-2xl`, borda `white/[0.06]`,
  padding padrão. Aceita `className` para ajustes pontuais.
- **`IconButton`** — botão redondo de ícone com três variantes:
  `primary` (preenchido em `accent`), `secondary` (`bg-surface`) e
  `ghost` (transparente). Exige `aria-label`.
- **`Chip`** — pílula `bg-surface` usada por BPM, alcance de casas e
  seletores. Suporta estado `active`.
- **`ProgressBar`** — trilha `accent-dim` com preenchimento `accent`,
  dirigida por `value`/`max`, com `role="progressbar"` e os
  `aria-valuenow`/`aria-valuemax` correspondentes.

Motivo de existirem agora: os blocos B e C acrescentam telas (criar
exercício, revisar importação) e sem esses primitivos cada tela repetiria
as mesmas cadeias de classe Tailwind.

## 4. Eliminação da Duplicação em `App.tsx`

Hoje `App.tsx` repete o mesmo painel do player — fretboard, botão de
tocar, controles de metrônomo, rodapé com "Metrônomo ativo" e
"Reiniciar" — uma vez na aba Prática e outra na aba Exercícios. Esse
bloco vira um componente único:

**`src/components/practice/PracticePanel.tsx`** — recebe `currentIndex`
e renderiza: alternador de vista, a vista escolhida (grade ou linha do
tempo), a barra de progresso e a barra de controles inferior. As duas
abas passam a renderizar `<PracticePanel />`, e `App.tsx` volta a ser
cabeçalho, abas e os títulos de cada seção.

## 5. Modelo de Tempo

A linha do tempo precisa saber *quando* cada nota começa. O espaçamento
entre notas na sequência é global — vem da subdivisão geral, nunca da
figura por corda, que altera apenas o sustain. A linha do tempo é
portanto uma grade uniforme, fiel ao que o áudio toca.

Duas adições em domínio, ambas puras e testáveis isoladamente:

**`src/domain/music-theory/rhythm.ts`** ganha o mapa de duração em
tempos (beats), ao lado do mapa de notação Tone.js já existente:

```ts
export const SUBDIVISION_BEATS: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 0.5,
  triplet: 1 / 3,
  sixteenth: 0.25,
};
```

**`src/domain/playback/timeline-model.ts`** (novo):

```ts
export interface TimedNote {
  index: number;            // posição na sequência, casa com currentIndex
  position: FretPosition;
  startBeat: number;        // início em tempos, a partir de zero
  durationBeats: number;    // sustain resolvido pelo modo rítmico
}

export function buildTimeline(
  positions: FretPosition[],
  spacing: Subdivision,                       // subdivisão global
  durationFor: (position: FretPosition) => Subdivision,
): TimedNote[];
```

`buildTimeline` posiciona a nota `i` em `i * SUBDIVISION_BEATS[spacing]`
e resolve a duração por nota através do callback, que o chamador monta a
partir do modo rítmico. O domínio não conhece `RhythmMode` — a mesma
separação que o spec de figura por corda já estabeleceu para o motor de
áudio.

## 6. Vista Linha do Tempo

**`src/components/fretboard/TimelineRoll.tsx`** recebe `timeline` e
`currentIndex` e desenha:

- Seis linhas horizontais de corda, rotuladas `e B G D A E`, na mesma
  ordem da grade atual (corda 1 no topo).
- Cada nota como um círculo posicionado em
  `x = startBeat * PX_PER_BEAT`, na linha da sua corda, com o **número
  da casa** dentro — e não o nome da nota, que é o que a grade mostra.
  O nome da nota aparece em texto pequeno acima do círculo.
- Um playhead: linha vertical `accent` com um triângulo na base, na
  posição da nota atual. Antes de tocar, fica no início.
- Rolagem horizontal automática quando o playhead se aproxima da borda
  direita, mantendo-o visível em sequências longas.

Quando não há nota selecionada, a vista mostra as seis cordas vazias e um
texto orientando a montar a sequência na grade.

## 7. Alternador de Vista

**`src/state/ui-store.ts`** ganha `fretboardView: 'grid' | 'timeline'`
com padrão `'grid'`, e a ação `setFretboardView`. O alternador é um par
de `Chip` ("Braço" / "Linha do tempo") no topo do painel. A escolha não é
persistida nesta versão — o padrão sempre volta a `'grid'`.

## 8. Progresso da Execução

Sem XP e sem streak. O único indicador é o progresso da sequência atual,
derivado de `currentIndex` e do total de notas selecionadas:

- Texto `nota 11 / 58` ao lado do título do painel.
- `ProgressBar` com `value = currentIndex + 1` e `max = total`.

Fora de execução (`currentIndex === null`), o texto mostra o total de
notas e a barra fica em zero. Nada é gravado; o progresso vive apenas em
`playback-store`, que já existe.

## 9. Barra de Controles

O rodapé do painel passa a ser uma barra com botões redondos, como na
referência, agrupando o que hoje está espalhado:

- **Primário:** Começar/Parar, `IconButton` variante `primary`.
- **Limpar:** esvazia a seleção — é o comportamento que o "Reiniciar"
  atual já tem. O rótulo muda para "Limpar seleção" porque, ao lado de um
  playhead, "Reiniciar" seria lido como reiniciar a execução.
- **Metrônomo:** liga e desliga o metrônomo. O hook `useMetronome` já
  expõe `start`/`stop`, mas nenhum controle na interface os chama hoje —
  o texto "Metrônomo ativo" é estático. Este botão passa a chamá-los.
- **BPM:** `Chip` com `-` / valor / `+`.
- **Figura rítmica:** o seletor atual, com a alternância por
  nota/por corda intacta.

O único comportamento novo é o metrônomo passar a ser ligável; o motor de
áudio em si não muda.

## 10. Testes

O projeto é TDD e cada unidade nova entra com seus testes:

- `timeline-model.test.ts` — espaçamento uniforme, duração resolvida pelo
  callback, sequência vazia, e a garantia de que a figura por corda não
  altera `startBeat`.
- `TimelineRoll.test.tsx` — nota renderizada na corda e no offset certos,
  número da casa visível, playhead na nota atual, estado vazio.
- `PracticePanel.test.tsx` — alternância entre as vistas e presença dos
  controles.
- Um teste por primitivo de UI, cobrindo variantes e acessibilidade.

Os testes existentes de `Fretboard`, `App`, `MetronomeControls` e
`PlayButton` continuam valendo. Onde a marcação mudar, os testes são
ajustados para a nova estrutura sem afrouxar as asserções; os
`data-testid` atuais são preservados.

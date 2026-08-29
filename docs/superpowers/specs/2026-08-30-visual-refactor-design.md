# Guitar Teacher — Visual & Business-Rule Refactor Spec

Data: 2026-08-30
Status: Aprovado para planejamento de implementação
Referência visual: `imagens/referencia-ui.png`

## 1. Visão Geral

Refactoring da versão já funcional do Guitar Teacher: ajustes de regras de
negócio (ordem das cordas, faixa de casas, remoção do botão do metrônomo),
reorganização da UI em duas abas (Prática / Exercícios), e um refactor
visual completo para uma estética dark, estilo DAW/app de música moderno,
sem alterar a lógica de áudio/estado já validada. Nenhuma nova dependência
é introduzida — tudo é Tailwind CSS puro sobre os componentes existentes.

## 2. Regras de Negócio

### 2.1 Ordem das cordas (reversão de decisão anterior)

A sessão anterior decidiu explicitamente colocar a corda 6 (grave) no topo.
Esta decisão é revertida: `STRING_ORDER` em
`src/components/fretboard/Fretboard.tsx` passa de `[6,5,4,3,2,1]` para
`[1,2,3,4,5,6]` — corda 1 (E agudo) no topo, corda 6 (E grave) na base,
igual à imagem de referência. `STANDARD_TUNING`, `getNoteAt`, e toda a
lógica de domínio permanecem inalteradas — a mudança é apenas na ordem de
iteração/renderização visual.

### 2.2 Rótulos das cordas sem oitava

O cabeçalho de cada linha do fretboard hoje mostra `STANDARD_TUNING[string]`
diretamente (ex.: `"E2"`, `"A2"`). Uma nova função pura
`getPitchClass(noteName: string): string` (extrai a letra + acidente,
descartando o número da oitava via regex) é adicionada a
`src/domain/music-theory/notes.ts` e usada apenas para esse rótulo. Os
nomes das notas nos marcadores (`FretMarker`) já usam `note.pitchClass`
(sem oitava) e não mudam.

### 2.3 Casas estritamente 1–7 (nunca 0)

Três pontos precisam garantir que a casa 0 nunca apareça:

- `FretRangeControl.goToPrevious`: o floor passa de `Math.max(0, minFret - 1)`
  para `Math.max(1, minFret - 1)`.
- `exercise-store.ts`'s lógica de alargar o range visível (adicionada no
  ciclo de correções anterior) passa a fazer
  `Math.max(1, minOfExercisePositions)` em vez de aceitar 0.
- Os dois exercícios do catálogo que hoje geram posições com
  `minFret: 0` (`scale-c-major-open-position`, `arpeggio-c-major-open-position`
  em `src/domain/exercises/exercise-catalog.ts`) passam a gerar com
  `minFret: 1, maxFret: 4` — evita notas em corda solta nesses exercícios.

O valor padrão da store (`minFret: 1, maxFret: 7`) já está correto e não
muda.

### 2.4 Remoção do botão do metrônomo (parcial, não do módulo)

Apenas o botão de iniciar/parar o clique sonoro do metrônomo é removido de
`MetronomeControls.tsx`. Tudo o mais permanece: controle de BPM (+/-),
seletor de figura rítmica, e `PulseIndicator`. Nenhuma mudança em
`src/state/metronome-store.ts`, `src/audio/metronome.ts` ou
`src/hooks/useMetronome.ts` — o BPM/figura continuam sendo a fonte de
verdade que `useNotePlayback` usa para tocar a sequência marcada no tempo
certo. O `PulseIndicator` permanece renderizado mesmo que nunca pisque
(já que não há mais como iniciar o clique do metrônomo pela UI) — isso é
aceito como comportamento temporário desta versão.

## 3. Organização por Abas

### 3.1 Estado de navegação

Novo store mínimo `src/state/ui-store.ts`:

```ts
interface UiState {
  activeTab: 'practice' | 'exercises';
  setActiveTab: (tab: 'practice' | 'exercises') => void;
}
```

### 3.2 Componente de abas

Novo componente genérico `src/components/layout/Tabs.tsx`, sem lógica de
negócio — recebe uma lista de abas (`{ id, label }[]`), o id ativo, e um
callback `onChange`. Puramente apresentacional, reutilizável.

### 3.3 Reestruturação do `App.tsx`

`App.tsx` passa a renderizar:

- Um cabeçalho fixo com o `Tabs` (Prática / Exercícios), usando `ui-store`.
- **Aba "Prática / Fretboard Livre"**: `FretRangeControl`, `Fretboard`,
  `PlayButton`, `MetronomeControls`.
- **Aba "Exercícios"**: `ExerciseList` ao lado (ou acima, responsivo) do
  mesmo `Fretboard` + `PlayButton` + `MetronomeControls`. Selecionar um
  exercício popula o `fretboard-store` compartilhado e o fretboard já
  aparece atualizado na própria aba, sem trocar de tela.

Nenhum hook (`useFretboardSelection`, `useNotePlayback`, `useMetronome`)
muda de assinatura ou de dono do estado — é puramente reorganização de
onde os componentes já existentes são renderizados.

## 4. Refactor Visual (Tailwind puro)

Nenhuma mudança de props/lógica — apenas `className`. Direção visual
validada contra `imagens/referencia-ui.png`.

- **Paleta base**: fundo da página `bg-zinc-950`; painéis/cards
  `bg-zinc-900` com `border border-zinc-800`; texto principal
  `text-zinc-100`, texto secundário `text-zinc-400`. Acento em `amber-400`
  (mantém consistência com o highlight de playback já existente).
- **Braço do violão** (`Fretboard.tsx`): fundo com gradiente amadeirado
  escuro (`bg-gradient-to-b from-[#2b1d14] to-[#1a120c]`); trastes
  verticais metálicos entre casas (`border-r border-zinc-400/60`); nut/
  traste inicial mais grosso e claro à esquerda (`border-l-4
  border-zinc-300`).
- **Cordas com espessura progressiva**: usando valores arbitrários do
  Tailwind para uma progressão linear real entre as 6 linhas — corda 6
  (linha de baixo, mais grave) `border-b-[3px]`, corda 5 `border-b-[2.6px]`,
  corda 4 `border-b-[2.2px]`, corda 3 `border-b-[1.8px]`, corda 2
  `border-b-[1.4px]`, corda 1 (linha de cima, mais aguda) `border-b-[1px]`;
  todas em tom metálico (`border-zinc-300/70`). Um mapa
  `STRING_BORDER_WIDTH: Record<StringNumber, string>` centraliza esses
  valores para evitar espalhar números mágicos pelo JSX.
- **Inlays**: camada decorativa (`absolute`, `z-0`, atrás das cordas e
  marcadores) com pontos discretos (`bg-zinc-100/10`) centralizados nas
  casas 3, 5 e 7 — únicas visíveis dentro do range 1-7. Derivado
  diretamente do número da casa, sem depender de `FretPosition`/seleção.
- **Marcadores de nota** (`FretMarker.tsx`): nota selecionada em
  `bg-amber-400` com anel e glow (`ring-2 ring-amber-300/50
  shadow-[0_0_8px_rgba(251,191,36,0.6)]`); nota atualmente destacada
  durante o Play com glow mais intenso; `transition-all duration-200` em
  todas as mudanças de estado.
- **Tipografia e botões**: `font-medium tracking-wide` nos textos de
  controle; todos os botões (abas, Play/Stop, BPM +/-, figura rítmica,
  navegação de casas) com `transition-all duration-200` e estados
  `hover:`/`active:` consistentes (ex.: `hover:bg-zinc-700
  active:scale-95`).

## 5. Testes

- Testes existentes que dependem da ordem/rótulo das cordas (`Fretboard.test.tsx`)
  são atualizados para refletir a nova ordem (`STRING_ORDER = [1..6]`) e o
  novo rótulo sem oitava.
- Novo teste para `getPitchClass` em `notes.test.ts`.
- `FretRangeControl.test.tsx` ganha um caso cobrindo o floor em 1 (não 0).
- `exercise-catalog.test.ts` e `exercise-store.test.ts` são atualizados
  para os novos `minFret`/posições dos dois exercícios afetados.
- `MetronomeControls.test.tsx` remove o teste do botão de iniciar/parar e
  mantém os testes de BPM/figura rítmica.
- Novo `ui-store.test.ts` e `Tabs.test.tsx` (comportamento de seleção de
  aba).
- `App.test.tsx` é atualizado para verificar que as duas abas existem e
  que trocar de aba alterna o conteúdo renderizado.
- Nenhum teste de `audio/`, `state/fretboard-store.ts`,
  `state/metronome-store.ts`, `state/persistence.ts` ou dos hooks muda de
  comportamento esperado — só os testes de UI/apresentação que dependem
  de ordem/rótulos visuais.

## 6. Fora de Escopo

- Reativar o botão de iniciar/parar o metrônomo (fica para uma versão
  futura).
- Qualquer nova biblioteca de UI ou de ícones — tudo em Tailwind puro e
  texto/SVG inline se necessário.
- Mudanças na lógica de áudio, cálculo de notas, ou modelo de exercícios
  além do ajuste pontual de `minFret` nos dois exercícios citados.
- O finding já conhecido e parado (localStorage gravando a cada pulso do
  metrônomo) não faz parte deste refactor.

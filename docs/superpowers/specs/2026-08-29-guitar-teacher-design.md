# Guitar Teacher — Design Spec

Data: 2026-08-29
Status: Aprovado para planejamento de implementação

## 1. Visão Geral

Aplicativo web de uso pessoal para treino e estudo prático de guitarra,
combinando um braço (fretboard) interativo renderizado na horizontal com
playback de áudio (samples reais via Tone.js) e metrônomo configurável e
sincronizado.

Não há requisito de multi-usuário, login, ou deploy público. Persistência é
local (localStorage do navegador).

## 2. Especificações do Instrumento

- Guitarra de 6 cordas, afinação padrão: E2‑A2‑D3‑G3‑B3‑E4.
- Numeração de cordas segue a convenção musical tradicional: corda 6 = E
  grave (mais grossa), corda 1 = E agudo (mais fina).
- Orientação do fretboard: horizontal. Cordas correm horizontalmente,
  trastes verticalmente. O nut (mão esquerda) fica à esquerda da tela, o
  corpo do instrumento à direita.
- Ordem visual de cima para baixo: corda 6 no topo, corda 1 embaixo
  (E‑A‑D‑G‑B‑E), espelhando a disposição da imagem de referência
  (`imagens/image_5.png`), mas transposta para horizontal.
- Exibição inicial: casas 1 a 7, com controle para navegar/alterar o
  intervalo de casas visíveis.

## 3. Modelo de Domínio (`src/domain/`)

Camada pura em TypeScript, sem dependência de React, Tone.js ou qualquer
I/O. 100% testável por unidade.

- **`FretPosition`**: `{ string: 1|2|3|4|5|6, fret: number }`. Unidade
  atômica de uma posição no braço.
- **`Tuning`**: array de 6 notas-base (uma por corda solta), usado para
  calcular a nota resultante de qualquer `FretPosition` e para configurar
  o sampler.
- **`Note`**: resultado calculado — `{ pitchClass, octave, midi,
  frequency }`. Função pura `getNoteAt(tuning, position): Note`.
- **`Interval`/grau**: cálculo de intervalo/grau de uma nota em relação a
  uma tônica, usado para exibir graus opcionais nos marcadores.
- **`Scale` / `Arpeggio`**: definições teóricas como padrões de intervalos
  semitonais a partir de uma tônica (ex: maior = `[0,2,4,5,7,9,11]`),
  usadas para gerar posições no fretboard sob demanda.
- **`Exercise`**: `{ id, name, category, positions: FretPosition[] }` —
  sequência pré-ordenada de posições. `category` ∈ `'aquecimento' |
  'digitacao' | 'escala' | 'arpejo'`.
- **`exercise-catalog.ts`**: catálogo fixo (hardcoded) com um conjunto
  inicial de exercícios cobrindo as 4 categorias acima (a ser criado do
  zero, já que não existe hoje um catálogo prévio do usuário).

## 4. Estado da Aplicação (`src/state/`, Zustand)

- **`fretboard-store`**: intervalo de casas visíveis; lista ordenada de
  `SelectedNote` (= `FretPosition` + índice de ordem de clique). Cada
  clique em uma casa adiciona a nota ao final da sequência (toggle:
  clicar de novo remove). Não há suporte a acordes/notas simultâneas
  nesta versão — é sempre uma sequência estritamente ordenada pela ordem
  de clique, podendo pular livremente entre cordas/casas (ex:
  corda6/casa1 → corda5/casa2 → corda4/casa3 é válido).
- **`metronome-store`**: BPM atual, figura rítmica selecionada
  (semínima, colcheia, tercina, semicolcheia, etc.), estado
  playing/stopped, índice do pulso atual.
- **`exercise-store`**: exercício ativo selecionado do catálogo. Ao
  selecionar um exercício, suas `positions` populam o `fretboard-store`
  como a sequência ativa (mesmo mecanismo usado por seleção manual).
- **`persistence.ts`**: sincroniza com `localStorage` as preferências que
  fazem sentido persistir entre sessões — BPM/figura rítmica escolhidos e,
  quando aplicável, o intervalo de casas visível. A sequência de notas
  marcada manualmente pode ou não persistir (decisão de detalhe a
  resolver na implementação, sem impacto arquitetural).

## 5. Engine de Áudio (`src/audio/`, Tone.js)

- **`sampler.ts`**: um único `Tone.Sampler` configurado com um conjunto
  esparso de amostras reais de guitarra carregadas via URL/CDN (ex:
  pacote de samples públicos tipo `tonejs-instruments` ou equivalente); o
  Tone.js faz pitch-shift automático para preencher as notas
  intermediárias. Exposto via interface `INoteSampler { playNote(freq:
  number, duration: string): void }`. Requer `Tone.start()` no primeiro
  gesto do usuário (política de autoplay do navegador) e expõe um estado
  de carregamento assíncrono dos samples.
- **`metronome.ts`**: `Tone.Transport` + `Tone.Loop` agendado no BPM e
  subdivisão atuais, tocando um clique curto (synth simples, não precisa
  de sample) a cada pulso. Interface `IMetronome { start(), stop(),
  setBpm(bpm), setSubdivision(sub), onPulse(callback) }`. Roda de forma
  independente do playback de sequência — pode ser usado como metrônomo
  solto, sem nenhuma nota marcada.
- **`sequence-player.ts`**: consome a sequência ordenada do
  `fretboard-store` + configuração rítmica do `metronome-store`. Usa
  `Tone.Sequence` no mesmo `Transport` do metrônomo, garantindo
  sincronia perfeita entre o clique do metrônomo e o disparo das notas.
  A cada evento agendado: toca a nota via `sampler.playNote()` e emite o
  índice da nota atual, usado para destacar visualmente a
  corda/casa correspondente no fretboard em tempo real.
- Interfaces abstratas (`audio-engine.types.ts`) desacoplam `hooks`/
  `components` da implementação concreta do Tone.js, permitindo mocks
  nos testes.

## 6. Componentes (`src/components/`)

- `fretboard/Fretboard.tsx`: grid horizontal cordas × casas.
- `fretboard/FretMarker.tsx`: bolinha clicável, opcionalmente exibindo
  nome da nota ou grau.
- `fretboard/FretRangeControl.tsx`: navegação do intervalo de casas
  visíveis.
- `metronome/MetronomeControls.tsx`: BPM +/-, seleção de figura rítmica.
- `metronome/PulseIndicator.tsx`: indicador visual piscando em sincronia
  com o áudio do metrônomo.
- `player/PlayButton.tsx`: play/stop da sequência marcada.
- `exercises/ExerciseList.tsx`: lista de exercícios pré-definidos por
  categoria, com seleção.

Componentes não contêm lógica musical ou de agendamento de áudio — apenas
orquestram chamadas para `domain`/`audio`/`state` via hooks dedicados em
`src/hooks/`.

## 7. Fluxo de Playback (síntese do funcionamento)

1. Usuário clica em `Play`.
2. `sequence-player` lê a sequência ordenada (`fretboard-store`) e a
   config rítmica (`metronome-store`).
3. Agenda cada nota como evento no `Tone.Transport` (via
   `Tone.Sequence`), respeitando a duração da figura rítmica escolhida.
4. Cada evento: toca a nota (`sampler.playNote`) e atualiza o índice da
   nota atual, destacando a posição correspondente no fretboard.
5. O clique do metrônomo roda em paralelo no mesmo `Transport`,
   garantindo sincronia entre pulso audível, indicador visual piscando e
   playback das notas.

## 8. Stack e Ferramentas

- React + TypeScript + Vite
- Tailwind CSS
- Tone.js (samples reais via Sampler + Transport/Sequence/Loop para
  metrônomo e temporização)
- Zustand para estado global (fretboard, metrônomo, exercício ativo)
- Vitest + React Testing Library, seguindo TDD

## 9. Estratégia de Testes

- **`domain/`**: testes de unidade puros (cálculo de notas, frequências,
  geração de escalas/arpejos) — sem mocks, camada de maior cobertura.
- **`audio/`**: testes com Tone.js mockado através das interfaces
  (`INoteSampler`, `IMetronome`), verificando agendamento correto (ex:
  "N notas em BPM X com figura Y geram eventos nos tempos esperados").
- **`components/`**: testes com React Testing Library cobrindo interação
  (clique em casa marca/desmarca nota na sequência, clique em Play
  dispara playback, seleção de exercício popula o fretboard), com
  `audio`/`state` mockados via hooks.

## 10. Fora de Escopo (v1)

- Suporte a acordes/notas simultâneas na sequência (todas as notas
  marcadas tocam em sequência estrita, nunca ao mesmo tempo).
- Duração rítmica configurável por nota individual (a figura rítmica é
  global, aplicada a toda a sequência).
- Multi-usuário, autenticação, backend, ou deploy público.
- Edição/criação de exercícios customizados pela UI (catálogo é fixo no
  código nesta versão; pode virar melhoria futura usando o mesmo
  localStorage já decidido para persistência).

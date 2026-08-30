# Rhythm Figure: By Note vs. By String — Design Spec

Data: 2026-08-30 (sessão contínua)
Status: Aprovado para planejamento de implementação

## 1. Visão Geral

Hoje a figura rítmica (semínima, colcheia, tercina, semicolcheia) é uma
única configuração global aplicada a toda a sequência tocada. Este spec
adiciona um segundo modo, "por corda", onde cada uma das 6 cordas tem sua
própria figura rítmica configurável — afetando **apenas quanto tempo cada
nota soa** (sustain), não o espaçamento entre as notas na sequência, que
continua fixo e uniforme (controlado pela figura rítmica global e pelo
BPM, exatamente como hoje). O modo atual (uma figura para toda a
sequência) passa a se chamar "por nota" e continua sendo o padrão.

## 2. Modelo de Estado (`src/state/metronome-store.ts`)

Dois campos novos, dois métodos novos, sem remover nada existente:

```ts
export type RhythmMode = 'note' | 'string';

interface MetronomeState {
  bpm: number;
  subdivision: Subdivision;           // já existe — continua controlando o
                                       // espaçamento entre notas (intervalo
                                       // do Tone.Sequence) e a duração no
                                       // modo 'note'
  rhythmMode: RhythmMode;             // novo, padrão 'note'
  subdivisionByString: Record<StringNumber, Subdivision>; // novo
  isPlaying: boolean;
  currentPulse: number;
  setBpm: (bpm: number) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  setRhythmMode: (mode: RhythmMode) => void;              // novo
  setStringSubdivision: (string: StringNumber, subdivision: Subdivision) => void; // novo
  start: () => void;
  stop: () => void;
  setCurrentPulse: (pulseIndex: number) => void;
}
```

`subdivisionByString` inicia com todas as 6 cordas usando o mesmo valor de
`subdivision` (`'quarter'`), preservando o comportamento atual até o
usuário mudar algo manualmente. `setSubdivision` (o seletor global) muda
apenas o valor usado no modo `'note'` e o espaçamento da sequência — não
sobrescreve `subdivisionByString`.

## 3. Interface de Áudio

Mudança mínima e cirúrgica em `src/audio/audio-engine.types.ts` e
`src/audio/sequence-player.ts`: `ISequencePlayer.play()` passa a receber
notas que já trazem sua própria duração de sustain calculada, em vez de
receber um único `subdivision` global para todas:

```ts
// Antes:
play(notes: { frequency: number }[], bpm: number, subdivision: Subdivision): void;

// Depois:
play(notes: { frequency: number; duration: string }[], bpm: number, spacingSubdivision: Subdivision): void;
```

- `spacingSubdivision` continua sendo o único parâmetro que controla o
  intervalo do `Tone.Sequence` (quando cada passo dispara) — sempre vem do
  `subdivision` global da store, independente do `rhythmMode`.
- `duration` (por nota) é resolvido no hook, não na engine de áudio:
  `ToneSequencePlayer` deixa de importar `SUBDIVISION_DURATIONS`
  diretamente para calcular a duração — apenas repassa
  `note.duration` para `sampler.playNote(note.frequency, note.duration)`.
  Isso mantém a engine de áudio "burra" (sem saber o que é
  `rhythmMode`), coerente com a separação de camadas já estabelecida no
  projeto.

## 4. Cálculo da Duração por Nota (`src/hooks/useNotePlayback.ts`)

```ts
const notes = selectedNotes.map((position) => {
  const note = getNoteAt(STANDARD_TUNING, position);
  const subdivisionForNote =
    rhythmMode === 'string' ? subdivisionByString[position.string] : subdivision;
  return { frequency: note.frequency, duration: SUBDIVISION_DURATIONS[subdivisionForNote] };
});
sequencePlayer.play(notes, bpm, subdivision);
```

`subdivision` (global) continua sendo passado como terceiro argumento —
ele é o `spacingSubdivision`, nunca o `duration` de cada nota
individualmente quando em modo `'string'`.

## 5. Interface — `MetronomeControls`

- Dois botões pequenos ("Por nota" / "Por corda") alternando `rhythmMode`,
  estilo chip consistente com o resto da barra de controles.
- **Modo "Por nota"** (padrão): mantém exatamente o seletor único de
  figura rítmica já existente, ligado a `subdivision`.
- **Modo "Por corda"**: o seletor único é substituído por 6 seletores
  compactos, um por corda, rotulados com a nota da corda solta
  (`getPitchClass(STANDARD_TUNING[string])` — E/A/D/G/B/E), cada um ligado
  a `subdivisionByString[string]` via `setStringSubdivision`.

## 6. Persistência

`subdivisionByString` e `rhythmMode` **não são persistidos** nesta
versão — `src/state/persistence.ts` continua salvando apenas
`bpm`/`subdivision`/`minFret`/`maxFret`, como hoje. Adicionar persistência
para os campos novos é uma extensão simples de se fazer depois, mas fica
fora deste escopo para não tocar em `persistence.ts` sem necessidade.

## 7. Testes

- `metronome-store.test.ts`: novos testes para `rhythmMode` padrão,
  `setRhythmMode`, valor inicial de `subdivisionByString` (todas as cordas
  = `'quarter'`), e `setStringSubdivision` atualizando só a corda alvo.
- `sequence-player.test.ts`: teste atualizado para a nova assinatura de
  `play()` — cada nota do array de entrada já carrega sua própria
  `duration`, e o teste confirma que `sampler.playNote` é chamado com a
  `duration` de CADA nota individualmente (não mais um valor único
  derivado de um `subdivision` passado à parte).
- `useNotePlayback.test.tsx`: novo teste cobrindo o modo `'string'` —
  seleciona notas em cordas diferentes com figuras diferentes em
  `subdivisionByString`, chama `play()`, e confirma que
  `sequencePlayer.play()` recebe a `duration` correta por nota,
  correspondente à corda de cada uma.
- `MetronomeControls.test.tsx`: novos testes para a troca de modo, e para
  os 6 seletores aparecerem/desaparecerem conforme o modo ativo.

## 8. Fora de Escopo

- Mudar o espaçamento/tempo entre as notas por corda (decisão explícita
  desta sessão: só o sustain muda, não a cadência da sequência).
- Persistir `rhythmMode`/`subdivisionByString` no localStorage.
- Qualquer mudança em `src/domain/**` ou no modelo de `FretPosition`.
- Um terceiro modo "por nota individual" (duração configurável nota a
  nota, já rejeitado no spec original do projeto).

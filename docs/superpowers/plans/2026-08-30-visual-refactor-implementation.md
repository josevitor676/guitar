# Visual & Business-Rule Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the already-working Guitar Teacher app: fix string order/fret-range/note-label business rules, remove the metronome's start/stop button, add a Practice/Exercises tab layout, and re-skin the whole UI in a dark zinc/amber DAW-style theme — without touching audio/state/hooks logic.

**Architecture:** Every change is either (a) a small, isolated business-rule fix in an existing component/store/domain file, (b) two brand-new small pieces of state/UI (a `ui-store` and a `Tabs` component) that `App.tsx` composes, or (c) a pure Tailwind `className` restyle with no prop/logic changes. No new dependencies, no changes to `src/audio/**`, and no changes to the shapes of `fretboard-store`, `metronome-store`, `playback-store`, or any hook.

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS, Zustand, Vitest + React Testing Library (all already in place).

**Spec:** `docs/superpowers/specs/2026-08-30-visual-refactor-design.md`

## Global Constraints

- String order: string 1 (E agudo) topo, string 6 (E grave) base — reverte a ordem anterior.
- Rótulos de cabeçalho das cordas: apenas a classe de nota, sem oitava (E, A, D, G, B, E).
- Casas visíveis nunca incluem a casa 0 — nem no range padrão, nem na navegação (`FretRangeControl`), nem no alargamento de range ao selecionar um exercício, nem nos exercícios do catálogo.
- Apenas o botão de iniciar/parar o clique sonoro do metrônomo é removido; BPM, figura rítmica e `PulseIndicator` continuam existindo e funcionando exatamente como antes.
- Duas abas: "Prática / Fretboard Livre" e "Exercícios". A aba Exercícios contém a lista de exercícios E o fretboard/Play/controles de metrônomo, tudo na mesma tela.
- Paleta: fundo `zinc-950`, painéis `zinc-900`/`zinc-800`, acento único `amber-400`. Nenhuma nova biblioteca de UI/ícones.
- Nenhuma mudança em `src/audio/**`, `src/state/fretboard-store.ts`, `src/state/metronome-store.ts`, `src/state/playback-store.ts`, ou nas assinaturas de qualquer hook em `src/hooks/**`.

---

## Task 1: Domain — Strip Octave from a Note Name

**Files:**
- Modify: `src/domain/music-theory/notes.ts`
- Modify: `src/domain/music-theory/notes.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `getPitchClass(noteName: string): string`. Used by Task 2 (`Fretboard.tsx`'s string-header label).

- [ ] **Step 1: Write the failing tests**

Add to `src/domain/music-theory/notes.test.ts` (append after the existing `describe` blocks, keep the existing imports and add `getPitchClass` to the import line):

```ts
import { noteNameToMidi, midiToNoteName, midiToFrequency, getNoteAt, getPitchClass } from './notes';
```

```ts
describe('getPitchClass', () => {
  it('strips the octave from a natural note name', () => {
    expect(getPitchClass('E2')).toBe('E');
  });

  it('strips the octave from a sharp note name', () => {
    expect(getPitchClass('C#4')).toBe('C#');
  });

  it('handles negative octaves', () => {
    expect(getPitchClass('A-1')).toBe('A');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- notes`
Expected: FAIL — `getPitchClass` is not exported yet.

- [ ] **Step 3: Implement**

Add to `src/domain/music-theory/notes.ts` (after `getNoteAt`):

```ts
export function getPitchClass(noteName: string): string {
  const match = /^([A-G]#?)-?\d+$/.exec(noteName);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  return match[1];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- notes`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/music-theory/notes.ts src/domain/music-theory/notes.test.ts
git commit -m "feat(domain): add getPitchClass to strip octave from a note name"
```

---

## Task 2: Business Rule — String Order and Octave-Free Header Labels

**Files:**
- Modify: `src/components/fretboard/Fretboard.tsx`
- Modify: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- Consumes: `getPitchClass` from `../../domain/music-theory/notes` (Task 1).
- Produces: no interface change — `Fretboard`'s props and behavior for consumers (Task 7's `App.tsx`) are unchanged; only internal row order and header text change.

- [ ] **Step 1: Update the test**

Replace the first test in `src/components/fretboard/Fretboard.test.tsx` (the one currently named `'renders one row per string with the string tuning label'`):

```tsx
  it('renders one row per string with the string tuning label (no octave)', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getAllByText('E')).toHaveLength(2);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('G')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });
```

Leave the other two tests (`'renders a clickable cell...'` and `'marks a cell as pressed...'`) exactly as they are — they assert on cell count and on the `corda 6, casa 1` `aria-label`, neither of which depends on visual row order.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- Fretboard`
Expected: FAIL — the old assertions (`getByText('E2')`, `getByText('E4')`) are gone, so this specific test fails against the current component, which still renders `"E2"`/`"E4"`.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/fretboard/Fretboard.tsx`:

```tsx
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';
import { positionsEqual } from '../../domain/fretboard/fretboard-model';
import { FretMarker } from './FretMarker';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];

interface FretboardProps {
  currentIndex: number | null;
}

export function Fretboard({ currentIndex }: FretboardProps) {
  const { minFret, maxFret, selectedNotes, toggleNote } = useFretboardSelection();
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);
  const highlightedPosition = currentIndex !== null ? selectedNotes[currentIndex] : undefined;

  return (
    <div className="inline-block border-l-4 border-neutral-200 bg-neutral-900">
      {STRING_ORDER.map((string) => (
        <div key={string} className="flex items-center border-b border-neutral-700">
          <span className="w-10 text-center text-sm text-neutral-400">
            {getPitchClass(STANDARD_TUNING[string])}
          </span>
          {frets.map((fret) => {
            const position = { string, fret };
            const selected = selectedNotes.some((note) => positionsEqual(note, position));
            const highlighted = !!highlightedPosition && positionsEqual(highlightedPosition, position);
            const note = getNoteAt(STANDARD_TUNING, position);
            return (
              <FretMarker
                key={fret}
                string={string}
                fret={fret}
                selected={selected}
                highlighted={highlighted}
                noteLabel={note.pitchClass}
                onClick={() => toggleNote(position)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
```

Only `STRING_ORDER` (now `[1,2,3,4,5,6]`) and the header `<span>` (now `getPitchClass(...)`) changed from the current file — everything else, including all class names, stays the same in this task (visual restyle is Tasks 8-9).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- Fretboard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/Fretboard.tsx src/components/fretboard/Fretboard.test.tsx
git commit -m "fix(fretboard): put string 1 on top and drop octave from header labels"
```

---

## Task 3: Business Rule — Never Navigate to Fret 0

**Files:**
- Modify: `src/components/fretboard/FretRangeControl.tsx`
- Modify: `src/components/fretboard/FretRangeControl.test.tsx`

**Interfaces:**
- Consumes/Produces: no change — same props (`minFret`, `maxFret`, `onChange`).

- [ ] **Step 1: Update the test**

Replace the second test in `src/components/fretboard/FretRangeControl.test.tsx` (`'calls onChange with a decremented range when "previous" is clicked, floored at fret 0'`) with two tests:

```tsx
  it('decrements down to fret 1 when starting above the floor', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={2} maxFret={8} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    expect(onChange).toHaveBeenCalledWith(1, 7);
  });

  it('stays at fret 1 (never fret 0) when already at the floor', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={7} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    expect(onChange).toHaveBeenCalledWith(1, 7);
  });
```

Leave the first test (`'calls onChange with an incremented range when "next" is clicked'`) unchanged.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- FretRangeControl`
Expected: FAIL — the current component floors at `0`, so clicking "Anterior" from `minFret=2` calls `onChange(1, 7)` correctly (this one would actually pass already), but from `minFret=1` it calls `onChange(0, 6)`, failing the new second test's expectation of `onChange(1, 7)`.

- [ ] **Step 3: Implement**

In `src/components/fretboard/FretRangeControl.tsx`, change only the floor value in `goToPrevious`:

```tsx
  const goToPrevious = () => {
    const nextMin = Math.max(1, minFret - 1);
    onChange(nextMin, nextMin + span);
  };
```

(This replaces the line `const nextMin = Math.max(0, minFret - 1);` — every other line in the file, including `goToNext` and the JSX, stays the same in this task.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- FretRangeControl`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/FretRangeControl.tsx src/components/fretboard/FretRangeControl.test.tsx
git commit -m "fix(fretboard): floor the visible fret range at 1, never 0"
```

---

## Task 4: Business Rule — No Open-String Positions in the Exercise Catalog

**Files:**
- Modify: `src/domain/exercises/exercise-catalog.ts`
- Modify: `src/domain/exercises/exercise-catalog.test.ts`
- Modify: `src/state/exercise-store.ts`
- Modify: `src/state/exercise-store.test.ts`

**Interfaces:**
- Consumes/Produces: no change — `EXERCISE_CATALOG`'s shape and `useExerciseStore`'s public shape are unchanged; only the generated `positions` data and the range-widening's floor value change.

- [ ] **Step 1: Write/update the failing tests**

Add to `src/domain/exercises/exercise-catalog.test.ts` (new test in the existing `describe` block):

```ts
  it('never includes fret 0 (open string) positions', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.positions.every((position) => position.fret >= 1)).toBe(true);
    }
  });
```

Replace the last test in `src/state/exercise-store.test.ts` (`'widens the visible fret range to cover an exercise whose positions fall outside the default range'`) with two tests that no longer depend on the catalog containing fret 0 (since Step 3 below removes it), instead narrowing the fretboard store's range in the test itself so the widening logic is still exercised:

```ts
  it('widens the visible fret range to cover an exercise whose positions fall outside the current range', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 10 });
    const exercise = EXERCISE_CATALOG.find((item) => item.id === 'warmup-1234-low-e')!;

    useExerciseStore.getState().selectExercise(exercise.id);

    const { minFret, maxFret } = useFretboardStore.getState();
    const frets = exercise.positions.map((position) => position.fret);
    expect(minFret).toBeLessThanOrEqual(Math.min(...frets));
    expect(maxFret).toBeGreaterThanOrEqual(Math.max(...frets));
  });

  it('never widens the visible range below fret 1', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 10 });
    const exercise = EXERCISE_CATALOG.find((item) => item.id === 'scale-c-major-open-position')!;

    useExerciseStore.getState().selectExercise(exercise.id);

    expect(useFretboardStore.getState().minFret).toBeGreaterThanOrEqual(1);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- exercise-catalog exercise-store`
Expected: FAIL — the catalog's `scale-c-major-open-position`/`arpeggio-c-major-open-position` still generate fret-0 positions, so the new catalog test fails; the exercise-store tests fail because the current `selectExercise` doesn't yet reference the fretboard store's *current* narrower range in the way the new tests expect (they should already pass once Step 3 is applied — run them now only to confirm they fail against the *current* code, i.e. before Step 3's clamp is added, `Math.min(...)` without the `Math.max(1, ...)` guard would still coincidentally satisfy the second new test since the catalog no longer has fret 0 after Step 3 — the important RED signal here is the catalog test).

- [ ] **Step 3: Implement**

In `src/domain/exercises/exercise-catalog.ts`, change both generated exercises' fret range from `{ minFret: 0, maxFret: 3 }` to `{ minFret: 1, maxFret: 4 }`:

```ts
  {
    id: 'scale-c-major-open-position',
    name: 'Escala Maior de Dó (posição aberta)',
    category: 'escala',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 1,
      maxFret: 4,
    }),
  },
  {
    id: 'arpeggio-c-major-open-position',
    name: 'Arpejo Maior de Dó (posição aberta)',
    category: 'arpejo',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', ARPEGGIO_PATTERNS.majorTriad, {
      minFret: 1,
      maxFret: 4,
    }),
  },
```

Nothing else in this file changes.

In `src/state/exercise-store.ts`, clamp the widened minimum at `1` (defensive, independent of what the catalog currently contains):

```ts
import { create } from 'zustand';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';
import { useFretboardStore } from './fretboard-store';

interface ExerciseState {
  activeExerciseId: string | null;
  selectExercise: (id: string) => void;
}

export const useExerciseStore = create<ExerciseState>((set) => ({
  activeExerciseId: null,
  selectExercise: (id) => {
    const exercise = EXERCISE_CATALOG.find((item) => item.id === id);
    if (!exercise) return;
    const fretboardStore = useFretboardStore.getState();
    fretboardStore.loadSequence(exercise.positions);

    const exerciseFrets = exercise.positions.map((position) => position.fret);
    const exerciseMinFret = Math.max(1, Math.min(...exerciseFrets));
    const exerciseMaxFret = Math.max(...exerciseFrets);
    const { minFret, maxFret } = useFretboardStore.getState();
    if (exerciseMinFret < minFret || exerciseMaxFret > maxFret) {
      useFretboardStore
        .getState()
        .setFretRange(Math.max(1, Math.min(minFret, exerciseMinFret)), Math.max(maxFret, exerciseMaxFret));
    }

    set({ activeExerciseId: id });
  },
}));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- exercise-catalog exercise-store`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/exercises/exercise-catalog.ts src/domain/exercises/exercise-catalog.test.ts \
  src/state/exercise-store.ts src/state/exercise-store.test.ts
git commit -m "fix(exercises): never generate or widen into fret 0"
```

---

## Task 5: Business Rule — Remove the Metronome Start/Stop Button

**Files:**
- Modify: `src/components/metronome/MetronomeControls.tsx`
- Modify: `src/components/metronome/MetronomeControls.test.tsx`

**Interfaces:**
- Consumes: `useMetronome()` (unchanged hook) — this component simply stops destructuring/using `isPlaying`, `start`, `stop`.
- Produces: no change to how `App.tsx` renders `<MetronomeControls />` (no props).

- [ ] **Step 1: Write the failing test**

Add to `src/components/metronome/MetronomeControls.test.tsx` (new test in the existing `describe` block):

```tsx
  it('does not render a metronome start/stop button', () => {
    render(<MetronomeControls />);
    expect(screen.queryByRole('button', { name: /metr[oô]nomo/i })).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- MetronomeControls`
Expected: FAIL — the current component still renders the "Iniciar metrônomo" button.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/metronome/MetronomeControls.tsx`:

```tsx
import type { Subdivision } from '../../domain/music-theory/rhythm';
import { useMetronome } from '../../hooks/useMetronome';

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Semínima',
  eighth: 'Colcheia',
  triplet: 'Tercina',
  sixteenth: 'Semicolcheia',
};

export function MetronomeControls() {
  const { bpm, subdivision, setBpm, setSubdivision } = useMetronome();

  return (
    <div className="flex items-center gap-4 text-neutral-200">
      <button type="button" onClick={() => setBpm(bpm - 5)} className="rounded bg-neutral-800 px-3 py-1">
        -
      </button>
      <span>{bpm} BPM</span>
      <button type="button" onClick={() => setBpm(bpm + 5)} className="rounded bg-neutral-800 px-3 py-1">
        +
      </button>

      <label className="flex items-center gap-2">
        Figura rítmica
        <select
          value={subdivision}
          onChange={(event) => setSubdivision(event.target.value as Subdivision)}
          className="rounded bg-neutral-800 px-2 py-1"
        >
          {Object.entries(SUBDIVISION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

The only change from the current file is dropping `isPlaying`/`start`/`stop` from the `useMetronome()` destructure and removing the trailing `<button>` that called them. Visual restyle of the remaining controls happens in Task 10.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- MetronomeControls`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/metronome/MetronomeControls.tsx src/components/metronome/MetronomeControls.test.tsx
git commit -m "fix(metronome): remove the start/stop button, keep bpm/subdivision controls"
```

---

## Task 6: UI State and Tabs Component

**Files:**
- Create: `src/state/ui-store.ts`
- Create: `src/state/ui-store.test.ts`
- Create: `src/components/layout/Tabs.tsx`
- Create: `src/components/layout/Tabs.test.tsx`

**Interfaces:**
- Produces: `TabId = 'practice' | 'exercises'`, `useUiStore` exposing `{ activeTab: TabId; setActiveTab: (tab: TabId) => void }`; `<Tabs tabs={{id: string; label: string}[]} activeTabId={string} onChange={(id: string) => void} />`. Both are used by Task 7 (`App.tsx`).

- [ ] **Step 1: Write the failing tests**

`src/state/ui-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'practice' });
  });

  it('defaults to the practice tab', () => {
    expect(useUiStore.getState().activeTab).toBe('practice');
  });

  it('switches to another tab via setActiveTab', () => {
    useUiStore.getState().setActiveTab('exercises');
    expect(useUiStore.getState().activeTab).toBe('exercises');
  });
});
```

`src/components/layout/Tabs.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const TABS = [
  { id: 'practice', label: 'Prática' },
  { id: 'exercises', label: 'Exercícios' },
];

describe('Tabs', () => {
  it('renders every tab label', () => {
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Prática' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Exercícios' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={TABS} activeTabId="exercises" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Exercícios' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Prática' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Exercícios' }));
    expect(onChange).toHaveBeenCalledWith('exercises');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- ui-store Tabs`
Expected: FAIL — `ui-store.ts` and `Tabs.tsx` do not exist yet.

- [ ] **Step 3: Implement**

`src/state/ui-store.ts`:

```ts
import { create } from 'zustand';

export type TabId = 'practice' | 'exercises';

interface UiState {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'practice',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
```

`src/components/layout/Tabs.tsx`:

```tsx
interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTabId, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex gap-2 border-b border-zinc-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTabId}
          onClick={() => onChange(tab.id)}
          className={[
            'px-4 py-2 text-sm font-medium tracking-wide transition-all duration-200',
            tab.id === activeTabId
              ? 'border-b-2 border-amber-400 text-amber-400'
              : 'text-zinc-400 hover:text-zinc-200',
          ].join(' ')}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- ui-store Tabs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/ui-store.ts src/state/ui-store.test.ts \
  src/components/layout/Tabs.tsx src/components/layout/Tabs.test.tsx
git commit -m "feat(ui): add tab navigation state and Tabs component"
```

---

## Task 7: App — Practice/Exercises Tab Layout

**Files:**
- Modify: `src/components/layout/App.tsx`
- Modify: `src/components/layout/App.test.tsx`

**Interfaces:**
- Consumes: `Tabs`, `TabId`, `useUiStore` (Task 6). Every other import in `App.tsx` is unchanged.
- Produces: no external interface change — `App` still takes no props.

- [ ] **Step 1: Update the test**

Replace the full contents of `src/components/layout/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { App } from './App';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, currentPulse: 0 });
    useUiStore.setState({ activeTab: 'practice' });
  });

  it('renders the practice tab by default with the fretboard, play button, and metronome controls', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /exerc[ií]cios/i })).not.toBeInTheDocument();
  });

  it('shows the exercise list and fretboard together after switching to the exercises tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /exerc[ií]cios/i }));
    expect(screen.getByRole('heading', { name: /exerc[ií]cios/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- App`
Expected: FAIL — the current `App.tsx` has no tabs, so `getByRole('tab', ...)` finds nothing, and the exercise list/heading is always rendered regardless of tab.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/layout/App.tsx`:

```tsx
import { useEffect } from 'react';
import { Fretboard } from '../fretboard/Fretboard';
import { FretRangeControl } from '../fretboard/FretRangeControl';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { PulseIndicator } from '../metronome/PulseIndicator';
import { PlayButton } from '../player/PlayButton';
import { ExerciseList } from '../exercises/ExerciseList';
import { Tabs } from './Tabs';
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useSamplerLoaded } from '../../hooks/useSamplerLoaded';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';
import type { TabId } from '../../state/ui-store';

const TABS: { id: TabId; label: string }[] = [
  { id: 'practice', label: 'Prática / Fretboard Livre' },
  { id: 'exercises', label: 'Exercícios' },
];

export function App() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse } = useMetronome();
  const samplerLoaded = useSamplerLoaded();
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  useEffect(() => {
    const preferences = loadPreferences();
    if (preferences) {
      useFretboardStore.getState().setFretRange(preferences.minFret, preferences.maxFret);
      useMetronomeStore.getState().setBpm(preferences.bpm);
      useMetronomeStore.getState().setSubdivision(preferences.subdivision);
    }
    return initPersistence();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <h1 className="mb-6 text-2xl font-bold">Guitar Teacher</h1>

      {!samplerLoaded && (
        <p className="mb-4 text-sm text-amber-400" role="status">
          Carregando sons...
        </p>
      )}

      <Tabs tabs={TABS} activeTabId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      {activeTab === 'practice' && (
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-4">
            <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
            <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
          </div>

          <Fretboard currentIndex={currentIndex} />

          <div className="mt-6 flex items-center gap-6">
            <PlayButton />
            <MetronomeControls />
          </div>
        </div>
      )}

      {activeTab === 'exercises' && (
        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <div className="lg:w-64">
            <h2 className="mb-2 text-lg font-semibold">Exercícios</h2>
            <ExerciseList />
          </div>

          <div>
            <Fretboard currentIndex={currentIndex} />
            <div className="mt-6 flex items-center gap-6">
              <PlayButton />
              <MetronomeControls />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

`main.tsx` is untouched — it already just renders `<App />`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- App`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite, no regressions from Tasks 1-7 combined)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/App.tsx src/components/layout/App.test.tsx
git commit -m "feat(app): split UI into Practice and Exercises tabs"
```

---

## Task 8: Visual — Fretboard Neck, Metallic Frets, Progressive String Weight, Inlays

**Files:**
- Modify: `src/components/fretboard/Fretboard.tsx`
- Modify: `src/components/fretboard/FretMarker.tsx`
- Modify: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- No prop or logic change to either component — pure `className` changes plus one new purely-decorative inlay layer inside `Fretboard`.

- [ ] **Step 1: Write the failing test**

Add to `src/components/fretboard/Fretboard.test.tsx` (new test in the existing `describe` block):

```tsx
  it('renders inlay markers only at frets 3, 5, and 7 within the visible range', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getByTestId('inlay-fret-3')).toBeInTheDocument();
    expect(screen.getByTestId('inlay-fret-5')).toBeInTheDocument();
    expect(screen.getByTestId('inlay-fret-7')).toBeInTheDocument();
    expect(screen.queryByTestId('inlay-fret-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('inlay-fret-2')).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- Fretboard`
Expected: FAIL — no `data-testid="inlay-fret-*"` elements exist yet.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/fretboard/Fretboard.tsx`:

```tsx
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';
import { positionsEqual } from '../../domain/fretboard/fretboard-model';
import { FretMarker } from './FretMarker';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];

const STRING_BORDER_WIDTH: Record<StringNumber, string> = {
  1: 'border-b-[1px]',
  2: 'border-b-[1.4px]',
  3: 'border-b-[1.8px]',
  4: 'border-b-[2.2px]',
  5: 'border-b-[2.6px]',
  6: 'border-b-[3px]',
};

const INLAY_FRETS = new Set([3, 5, 7]);
const LABEL_WIDTH_PX = 40;
const FRET_CELL_WIDTH_PX = 56;

interface FretboardProps {
  currentIndex: number | null;
}

export function Fretboard({ currentIndex }: FretboardProps) {
  const { minFret, maxFret, selectedNotes, toggleNote } = useFretboardSelection();
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);
  const highlightedPosition = currentIndex !== null ? selectedNotes[currentIndex] : undefined;

  return (
    <div className="relative inline-block border-l-4 border-zinc-300 bg-gradient-to-b from-[#2b1d14] to-[#1a120c]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {frets.map((fret, index) =>
          INLAY_FRETS.has(fret) ? (
            <span
              key={fret}
              data-testid={`inlay-fret-${fret}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-zinc-100/10"
              style={{ left: `${LABEL_WIDTH_PX + index * FRET_CELL_WIDTH_PX + FRET_CELL_WIDTH_PX / 2}px` }}
            />
          ) : null,
        )}
      </div>

      <div className="relative z-10">
        {STRING_ORDER.map((string) => (
          <div key={string} className={`flex items-center border-zinc-300/70 ${STRING_BORDER_WIDTH[string]}`}>
            <span className="w-10 text-center text-sm text-zinc-400">
              {getPitchClass(STANDARD_TUNING[string])}
            </span>
            {frets.map((fret) => {
              const position = { string, fret };
              const selected = selectedNotes.some((note) => positionsEqual(note, position));
              const highlighted = !!highlightedPosition && positionsEqual(highlightedPosition, position);
              const note = getNoteAt(STANDARD_TUNING, position);
              return (
                <FretMarker
                  key={fret}
                  string={string}
                  fret={fret}
                  selected={selected}
                  highlighted={highlighted}
                  noteLabel={note.pitchClass}
                  onClick={() => toggleNote(position)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
```

In `src/components/fretboard/FretMarker.tsx`, change only the fret-line (border) color — replace `border-r border-neutral-700` with `border-r border-zinc-400/60` in the `className` array's first string, leaving every other class and all logic in the file untouched:

```tsx
      className={[
        'flex h-10 w-14 items-center justify-center border-r border-zinc-400/60 text-xs font-medium transition-colors',
        highlighted ? 'bg-amber-400 text-neutral-900' : selected ? 'bg-neutral-300 text-neutral-900' : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800',
      ].join(' ')}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- Fretboard`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite — the label-text test from Task 2 still passes since `getPitchClass` output is unchanged, and the cell-count/click tests are unaffected by styling)

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/Fretboard.tsx src/components/fretboard/FretMarker.tsx \
  src/components/fretboard/Fretboard.test.tsx
git commit -m "style(fretboard): wood-toned neck, metallic frets, progressive string weight, inlays"
```

---

## Task 9: Visual — Marker Glow, Ring, and Transitions

**Files:**
- Modify: `src/components/fretboard/FretMarker.tsx`
- Modify: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- No prop or logic change — pure `className` restyle of the selected/highlighted/idle states.

- [ ] **Step 1: Write the failing tests**

Add to `src/components/fretboard/Fretboard.test.tsx` (new tests in the existing `describe` block):

```tsx
  it('applies a glow/ring style to a selected fret marker', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    expect(cell.className).toMatch(/ring-2/);
    expect(cell.className).toMatch(/shadow-/);
  });

  it('applies a stronger glow to the currently highlighted marker during playback', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={0} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    expect(cell.className).toMatch(/ring-amber-200/);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- Fretboard`
Expected: FAIL — the current `FretMarker` classes have no `ring-*`/`shadow-*` utilities.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/fretboard/FretMarker.tsx`:

```tsx
interface FretMarkerProps {
  string: number;
  fret: number;
  selected: boolean;
  highlighted: boolean;
  noteLabel: string;
  onClick: () => void;
}

export function FretMarker({ string, fret, selected, highlighted, noteLabel, onClick }: FretMarkerProps) {
  return (
    <button
      type="button"
      aria-label={`corda ${string}, casa ${fret}`}
      aria-pressed={selected}
      onClick={onClick}
      className={[
        'flex h-10 w-14 items-center justify-center border-r border-zinc-400/60 text-xs font-medium tracking-wide transition-all duration-200',
        highlighted
          ? 'bg-amber-300 text-zinc-900 ring-2 ring-amber-200/70 shadow-[0_0_10px_rgba(252,211,77,0.8)]'
          : selected
            ? 'bg-amber-400 text-zinc-900 ring-2 ring-amber-300/50 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
            : 'bg-transparent text-zinc-500 hover:bg-zinc-100/5',
      ].join(' ')}
    >
      {selected ? noteLabel : ''}
    </button>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- Fretboard`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/FretMarker.tsx src/components/fretboard/Fretboard.test.tsx
git commit -m "style(fretboard): add glow/ring effect and transitions to note markers"
```

---

## Task 10: Visual — Global Zinc/Amber Theme Sweep

**Files:**
- Modify: `src/components/layout/App.tsx`
- Modify: `src/components/fretboard/FretRangeControl.tsx`
- Modify: `src/components/metronome/MetronomeControls.tsx`
- Modify: `src/components/metronome/PulseIndicator.tsx`
- Modify: `src/components/metronome/PulseIndicator.test.tsx`
- Modify: `src/components/player/PlayButton.tsx`
- Modify: `src/components/exercises/ExerciseList.tsx`

**Interfaces:**
- No prop or logic change to any file — pure `className` restyle across the remaining `neutral-*` surfaces to match the `zinc-950`/`zinc-900`/`zinc-800`/`amber-400` palette already established in `Tabs.tsx` (Task 6) and `Fretboard`/`FretMarker` (Tasks 8-9).

- [ ] **Step 1: Update the one behavioral test affected by a color rename**

Replace both assertions in `src/components/metronome/PulseIndicator.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PulseIndicator } from './PulseIndicator';

describe('PulseIndicator', () => {
  it('is dim when not playing', () => {
    render(<PulseIndicator currentPulse={0} isPlaying={false} />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-zinc-700');
  });

  it('is lit when playing', () => {
    render(<PulseIndicator currentPulse={2} isPlaying />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-amber-400');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- PulseIndicator`
Expected: FAIL — the current component still renders `bg-neutral-700`.

- [ ] **Step 3: Implement**

`src/components/metronome/PulseIndicator.tsx`:

```tsx
interface PulseIndicatorProps {
  currentPulse: number;
  isPlaying: boolean;
}

export function PulseIndicator({ currentPulse, isPlaying }: PulseIndicatorProps) {
  return (
    <div
      data-testid="pulse-indicator"
      data-pulse={currentPulse}
      className={`h-4 w-4 rounded-full transition-all duration-200 ${
        isPlaying ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-zinc-700'
      }`}
    />
  );
}
```

`src/components/fretboard/FretRangeControl.tsx`:

```tsx
interface FretRangeControlProps {
  minFret: number;
  maxFret: number;
  onChange: (minFret: number, maxFret: number) => void;
}

export function FretRangeControl({ minFret, maxFret, onChange }: FretRangeControlProps) {
  const span = maxFret - minFret;

  const goToPrevious = () => {
    const nextMin = Math.max(1, minFret - 1);
    onChange(nextMin, nextMin + span);
  };

  const goToNext = () => {
    onChange(minFret + 1, maxFret + 1);
  };

  return (
    <div className="flex items-center gap-2 text-sm font-medium tracking-wide text-zinc-300">
      <button
        type="button"
        onClick={goToPrevious}
        className="rounded bg-zinc-800 px-2 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        Anterior
      </button>
      <span>
        Casas {minFret}-{maxFret}
      </span>
      <button
        type="button"
        onClick={goToNext}
        className="rounded bg-zinc-800 px-2 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        Próximo
      </button>
    </div>
  );
}
```

`src/components/metronome/MetronomeControls.tsx`:

```tsx
import type { Subdivision } from '../../domain/music-theory/rhythm';
import { useMetronome } from '../../hooks/useMetronome';

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Semínima',
  eighth: 'Colcheia',
  triplet: 'Tercina',
  sixteenth: 'Semicolcheia',
};

export function MetronomeControls() {
  const { bpm, subdivision, setBpm, setSubdivision } = useMetronome();

  return (
    <div className="flex items-center gap-4 font-medium tracking-wide text-zinc-200">
      <button
        type="button"
        onClick={() => setBpm(bpm - 5)}
        className="rounded bg-zinc-800 px-3 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        -
      </button>
      <span>{bpm} BPM</span>
      <button
        type="button"
        onClick={() => setBpm(bpm + 5)}
        className="rounded bg-zinc-800 px-3 py-1 transition-all duration-200 hover:bg-zinc-700 active:scale-95"
      >
        +
      </button>

      <label className="flex items-center gap-2">
        Figura rítmica
        <select
          value={subdivision}
          onChange={(event) => setSubdivision(event.target.value as Subdivision)}
          className="rounded bg-zinc-800 px-2 py-1 transition-all duration-200"
        >
          {Object.entries(SUBDIVISION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

`src/components/player/PlayButton.tsx`:

```tsx
import { useNotePlayback } from '../../hooks/useNotePlayback';

export function PlayButton() {
  const { play, stop, isPlaying } = useNotePlayback();

  return (
    <button
      type="button"
      onClick={() => (isPlaying ? stop() : play())}
      className="rounded bg-amber-400 px-4 py-2 font-semibold tracking-wide text-zinc-900 transition-all duration-200 hover:bg-amber-300 active:scale-95"
    >
      {isPlaying ? 'Parar' : 'Play'}
    </button>
  );
}
```

`src/components/exercises/ExerciseList.tsx`:

```tsx
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import { useExerciseStore } from '../../state/exercise-store';

const CATEGORY_LABELS: Record<string, string> = {
  aquecimento: 'Aquecimento',
  digitacao: 'Digitação',
  escala: 'Escala',
  arpejo: 'Arpejo',
};

export function ExerciseList() {
  const activeExerciseId = useExerciseStore((state) => state.activeExerciseId);
  const selectExercise = useExerciseStore((state) => state.selectExercise);

  return (
    <ul className="flex flex-col gap-2">
      {EXERCISE_CATALOG.map((exercise) => (
        <li key={exercise.id}>
          <button
            type="button"
            onClick={() => selectExercise(exercise.id)}
            aria-pressed={exercise.id === activeExerciseId}
            className={[
              'w-full rounded border px-3 py-2 text-left font-medium tracking-wide transition-all duration-200',
              exercise.id === activeExerciseId
                ? 'border-amber-400/50 bg-zinc-800 text-zinc-100'
                : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800',
            ].join(' ')}
          >
            <span className="mr-2 text-xs uppercase text-zinc-500">{CATEGORY_LABELS[exercise.category]}</span>
            {exercise.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

In `src/components/layout/App.tsx`, replace only the outer wrapper's className and the two heading classNames — everything else (imports, tab logic, JSX structure) stays exactly as Task 7 left it:

```tsx
    <div className="min-h-screen bg-zinc-950 p-6 font-medium tracking-wide text-zinc-100">
      <h1 className="mb-6 text-2xl font-bold tracking-wide">Guitar Teacher</h1>
```

and

```tsx
            <h2 className="mb-2 text-lg font-semibold tracking-wide">Exercícios</h2>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- PulseIndicator`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite — no other test in the project asserts on any of the `neutral-*`/`zinc-*` classes touched here besides `PulseIndicator.test.tsx`)

Run: `npm run build`
Expected: PASS (no TypeScript errors — this task is CSS-only)

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/App.tsx src/components/fretboard/FretRangeControl.tsx \
  src/components/metronome/MetronomeControls.tsx src/components/metronome/PulseIndicator.tsx \
  src/components/metronome/PulseIndicator.test.tsx src/components/player/PlayButton.tsx \
  src/components/exercises/ExerciseList.tsx
git commit -m "style: finish zinc/amber theme sweep across remaining components"
```

---

## Self-Review Notes

- **Spec coverage:** every item in the spec's Sections 2-4 maps to a task — string order (Task 2), octave-free labels (Task 1+2), fret range 1-7 everywhere (Tasks 3-4), metronome button removal (Task 5), tabs (Tasks 6-7), and the full visual pass (Tasks 8-10).
- **Type consistency verified:** `getPitchClass`, `TabId`, `useUiStore`'s shape, and `Tabs`' props are each defined once (Tasks 1 and 6) and reused verbatim by every later task's Interfaces block.
- **No changes to `src/audio/**`, `fretboard-store.ts`, `metronome-store.ts`, `playback-store.ts`, or any hook signature** — confirmed against every task's file list above; only `exercise-store.ts`'s already-existing widening logic gets a floor clamp (Task 4), not a shape change.
- **Out of scope confirmed absent:** no metronome-store/audio/metronome.ts changes, no new dependencies, no reactivation of the removed button — matching the spec's Section 6.

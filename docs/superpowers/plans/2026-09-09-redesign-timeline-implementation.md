# Visual Redesign + Timeline View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the neutral monochrome look with a warm dark, orange-accented design language, and add a second way to view the played sequence — a timeline "roll" with a moving playhead — while removing the duplicated player panel from `App.tsx`.

**Architecture:** Colors move into `src/design/tokens.ts`, which `tailwind.config.ts` consumes, so every existing `bg-card` / `text-accent` class repaints without being edited. A pure domain function `buildTimeline` turns the selected positions plus the rhythm settings into timed notes; a `useTimeline` hook wires the stores to it; `TimelineRoll` renders them and stays a pure presentational component. The duplicated player panel in `App.tsx` becomes one `PracticePanel` that hosts a view toggle (grid vs. timeline), a progress bar, and a new round-button `ControlBar`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 3, Zustand, Tone.js, lucide-react, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-09-redesign-timeline-design.md`

## Global Constraints

- Token names stay exactly as they are today (`body`, `card`, `surface`, `accent`, `text-primary`, `text-secondary`); only their values change, plus two additions (`accent-soft`, `accent-dim`). Never rename a token.
- Note spacing on the timeline is always driven by the **global** `subdivision`. The per-string rhythm figure changes only `durationBeats`, never `startBeat`.
- No changes to anything under `src/audio/**`.
- No new persistence: `fretboardView` is not written to localStorage, and no XP, streak, or session history is added.
- No tablature and no musical staff are ever drawn on screen.
- All UI copy is Portuguese, matching the existing interface.
- Existing `data-testid` values (`fret-number-*`, `inlay-fret-*`, `string-line-*`, `pulse-indicator`) must survive.
- Run the full suite with `npm test` before every commit.

---

## Task 1: Design Tokens

**Files:**
- Create: `src/design/tokens.ts`
- Create: `src/design/tokens.test.ts`
- Modify: `tailwind.config.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `COLORS`, a frozen record of token name → CSS color string, importable from both Tailwind config and React components.

- [ ] **Step 1: Write the failing test**

Create `src/design/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { COLORS } from './tokens';

describe('COLORS', () => {
  it('uses the warm near-black backgrounds instead of the old neutral greys', () => {
    expect(COLORS.body).toBe('#0E0C0B');
    expect(COLORS.card).toBe('#17130F');
    expect(COLORS.surface).toBe('#241D18');
  });

  it('uses orange as the accent, with a softer press state and a dim halo', () => {
    expect(COLORS.accent).toBe('#FF7A18');
    expect(COLORS['accent-soft']).toBe('#C25A20');
    expect(COLORS['accent-dim']).toBe('rgba(255, 122, 24, 0.16)');
  });

  it('keeps warm text colors', () => {
    expect(COLORS['text-primary']).toBe('#FAFAFA');
    expect(COLORS['text-secondary']).toBe('#A6968B');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/design/tokens.test.ts`
Expected: FAIL — cannot resolve `./tokens`.

- [ ] **Step 3: Write the tokens module**

Create `src/design/tokens.ts`:

```ts
export const COLORS = {
  body: '#0E0C0B',
  card: '#17130F',
  surface: '#241D18',
  accent: '#FF7A18',
  'accent-soft': '#C25A20',
  'accent-dim': 'rgba(255, 122, 24, 0.16)',
  'text-primary': '#FAFAFA',
  'text-secondary': '#A6968B',
} as const;
```

- [ ] **Step 4: Point Tailwind at the tokens**

Replace the `colors` block in `tailwind.config.ts` so the config has a single source of truth:

```ts
import type { Config } from 'tailwindcss'
import { COLORS } from './src/design/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ...COLORS },
      borderRadius: {
        card: '1rem',
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS — the token test passes and nothing else regresses.

- [ ] **Step 6: Verify Tailwind actually resolves the TypeScript import**

Run: `rm -rf dist && npm run build && grep -c "255, 122, 24" dist/assets/*.css`
Expected: a count of at least 1. Tailwind 3 loads a TS config through its own transpiler; this step proves the relative `./src/design/tokens` import resolves at build time.
If the count is 0 or the build errors on the import, inline the literal hex values back into `tailwind.config.ts` (keeping `src/design/tokens.ts` and its test as the source components import), and note this in the commit message.

- [ ] **Step 7: Commit**

```bash
git add src/design tailwind.config.ts
git commit -m "feat(design): move the palette into tokens and switch to a warm orange accent"
```

---

## Task 2: Subdivision Duration in Beats

**Files:**
- Modify: `src/domain/music-theory/rhythm.ts`
- Test: `src/domain/music-theory/rhythm.test.ts`

**Interfaces:**
- Consumes: the existing `Subdivision` union from the same file.
- Produces: `SUBDIVISION_BEATS: Record<Subdivision, number>` — how many quarter-note beats one subdivision lasts. Task 3 uses it.

- [ ] **Step 1: Write the failing test**

Append to `src/domain/music-theory/rhythm.test.ts`:

```ts
import { SUBDIVISION_BEATS } from './rhythm';

describe('SUBDIVISION_BEATS', () => {
  it('measures every subdivision in quarter-note beats', () => {
    expect(SUBDIVISION_BEATS.quarter).toBe(1);
    expect(SUBDIVISION_BEATS.eighth).toBe(0.5);
    expect(SUBDIVISION_BEATS.sixteenth).toBe(0.25);
  });

  it('makes three triplets fill exactly one beat', () => {
    expect(SUBDIVISION_BEATS.triplet * 3).toBeCloseTo(1, 10);
  });
});
```

Move the new `import` up next to the existing `SUBDIVISION_DURATIONS` import so there is one import statement from `./rhythm`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/music-theory/rhythm.test.ts`
Expected: FAIL — `SUBDIVISION_BEATS` is not exported.

- [ ] **Step 3: Add the map**

Append to `src/domain/music-theory/rhythm.ts`:

```ts
export const SUBDIVISION_BEATS: Record<Subdivision, number> = {
  quarter: 1,
  eighth: 0.5,
  triplet: 1 / 3,
  sixteenth: 0.25,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/music-theory/rhythm.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain/music-theory/rhythm.ts src/domain/music-theory/rhythm.test.ts
git commit -m "feat(rhythm): express each subdivision as a duration in beats"
```

---

## Task 3: Timeline Model

**Files:**
- Create: `src/domain/playback/timeline-model.ts`
- Create: `src/domain/playback/timeline-model.test.ts`

**Interfaces:**
- Consumes: `FretPosition` from `../music-theory/tuning`; `Subdivision` and `SUBDIVISION_BEATS` from `../music-theory/rhythm`.
- Produces:
  - `interface TimedNote { index: number; position: FretPosition; startBeat: number; durationBeats: number }`
  - `function buildTimeline(positions: FretPosition[], spacing: Subdivision, durationFor: (position: FretPosition) => Subdivision): TimedNote[]`
  - `function timelineLengthInBeats(timeline: TimedNote[]): number`

Tasks 6, 7 and 9 depend on these exact names.

- [ ] **Step 1: Write the failing test**

Create `src/domain/playback/timeline-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTimeline, timelineLengthInBeats } from './timeline-model';
import type { FretPosition } from '../music-theory/tuning';

const positions: FretPosition[] = [
  { string: 6, fret: 3 },
  { string: 6, fret: 5 },
  { string: 5, fret: 3 },
];

const allQuarters = () => 'quarter' as const;

describe('buildTimeline', () => {
  it('returns an empty timeline for an empty selection', () => {
    expect(buildTimeline([], 'quarter', allQuarters)).toEqual([]);
  });

  it('spaces notes evenly by the global subdivision and keeps the selection order', () => {
    const timeline = buildTimeline(positions, 'eighth', allQuarters);

    expect(timeline.map((note) => note.startBeat)).toEqual([0, 0.5, 1]);
    expect(timeline.map((note) => note.index)).toEqual([0, 1, 2]);
    expect(timeline.map((note) => note.position)).toEqual(positions);
  });

  it('resolves each note duration through the callback', () => {
    const timeline = buildTimeline(positions, 'quarter', (position) =>
      position.string === 6 ? 'sixteenth' : 'quarter',
    );

    expect(timeline.map((note) => note.durationBeats)).toEqual([0.25, 0.25, 1]);
  });

  it('never lets the per-note duration change the spacing between notes', () => {
    const spacedByQuarters = buildTimeline(positions, 'quarter', allQuarters);
    const sameSpacingShorterNotes = buildTimeline(positions, 'quarter', () => 'sixteenth');

    expect(sameSpacingShorterNotes.map((note) => note.startBeat)).toEqual(
      spacedByQuarters.map((note) => note.startBeat),
    );
  });
});

describe('timelineLengthInBeats', () => {
  it('is zero for an empty timeline', () => {
    expect(timelineLengthInBeats([])).toBe(0);
  });

  it('spans from the first onset to the end of the last note', () => {
    const timeline = buildTimeline(positions, 'quarter', allQuarters);
    expect(timelineLengthInBeats(timeline)).toBe(3);
  });

  it('accounts for a final note that sustains past its slot', () => {
    const timeline = buildTimeline(positions, 'eighth', allQuarters);
    expect(timelineLengthInBeats(timeline)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/playback/timeline-model.test.ts`
Expected: FAIL — cannot resolve `./timeline-model`.

- [ ] **Step 3: Write the implementation**

Create `src/domain/playback/timeline-model.ts`:

```ts
import type { FretPosition } from '../music-theory/tuning';
import type { Subdivision } from '../music-theory/rhythm';
import { SUBDIVISION_BEATS } from '../music-theory/rhythm';

export interface TimedNote {
  index: number;
  position: FretPosition;
  startBeat: number;
  durationBeats: number;
}

export function buildTimeline(
  positions: FretPosition[],
  spacing: Subdivision,
  durationFor: (position: FretPosition) => Subdivision,
): TimedNote[] {
  const spacingInBeats = SUBDIVISION_BEATS[spacing];

  return positions.map((position, index) => ({
    index,
    position,
    startBeat: index * spacingInBeats,
    durationBeats: SUBDIVISION_BEATS[durationFor(position)],
  }));
}

export function timelineLengthInBeats(timeline: TimedNote[]): number {
  return timeline.reduce((end, note) => Math.max(end, note.startBeat + note.durationBeats), 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/playback/timeline-model.test.ts`
Expected: PASS, all 7 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/domain/playback
git commit -m "feat(playback): add a timed-note model for the timeline view"
```

---

## Task 4: UI Primitives

**Files:**
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/Chip.tsx`
- Create: `src/components/ui/IconButton.tsx`
- Create: `src/components/ui/ProgressBar.tsx`
- Create: `src/components/ui/ui.test.tsx`

**Interfaces:**
- Consumes: nothing beyond React.
- Produces, used by Tasks 6, 8 and 9:
  - `Card({ children, className }: { children: ReactNode; className?: string })`
  - `Chip({ children, active, className }: { children: ReactNode; active?: boolean; className?: string })`
  - `IconButton({ label, variant, onClick, children }: { label: string; variant?: 'primary' | 'secondary' | 'ghost'; onClick: () => void; children: ReactNode })` — `label` becomes `aria-label`, default variant `secondary`.
  - `ProgressBar({ value, max, label }: { value: number; max: number; label: string })`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/ui.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { ProgressBar } from './ProgressBar';

describe('Card', () => {
  it('renders its children on the card surface', () => {
    render(<Card>conteúdo</Card>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('appends caller classes without dropping its own', () => {
    render(<Card className="mt-6">conteúdo</Card>);
    const card = screen.getByText('conteúdo');
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('mt-6');
  });
});

describe('Chip', () => {
  it('marks the active state so the accent styling can key off it', () => {
    render(<Chip active>Braço</Chip>);
    expect(screen.getByText('Braço')).toHaveAttribute('data-active', 'true');
  });

  it('is inactive by default', () => {
    render(<Chip>Braço</Chip>);
    expect(screen.getByText('Braço')).toHaveAttribute('data-active', 'false');
  });
});

describe('IconButton', () => {
  it('exposes its label to assistive technology and fires on click', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Tocar" onClick={onClick}>
        <span aria-hidden="true">▶</span>
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Tocar' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('fills with the accent color in the primary variant', () => {
    render(
      <IconButton label="Tocar" variant="primary" onClick={() => {}}>
        <span aria-hidden="true">▶</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Tocar' }).className).toContain('bg-accent');
  });
});

describe('ProgressBar', () => {
  it('reports its position through the progressbar role', () => {
    render(<ProgressBar value={11} max={58} label="Progresso do exercício" />);

    const bar = screen.getByRole('progressbar', { name: 'Progresso do exercício' });
    expect(bar).toHaveAttribute('aria-valuenow', '11');
    expect(bar).toHaveAttribute('aria-valuemax', '58');
  });

  it('stays at zero width when there is nothing to play', () => {
    render(<ProgressBar value={0} max={0} label="Progresso do exercício" />);

    const bar = screen.getByRole('progressbar', { name: 'Progresso do exercício' });
    expect(bar.firstElementChild).toHaveStyle({ width: '0%' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ui/ui.test.tsx`
Expected: FAIL — none of the four modules resolve.

- [ ] **Step 3: Write the four primitives**

`src/components/ui/Card.tsx`:

```tsx
import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-card p-6 ${className}`.trim()}>{children}</div>
  );
}
```

`src/components/ui/Chip.tsx`:

```tsx
import type { ReactNode } from 'react';

interface ChipProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function Chip({ children, active = false, className = '' }: ChipProps) {
  return (
    <span
      data-active={active}
      className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 ${
        active
          ? 'border-accent/40 bg-accent-dim text-text-primary'
          : 'border-white/[0.06] bg-surface text-text-secondary'
      } ${className}`.trim()}
    >
      {children}
    </span>
  );
}
```

`src/components/ui/IconButton.tsx`:

```tsx
import type { ReactNode } from 'react';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost';

interface IconButtonProps {
  label: string;
  onClick: () => void;
  children: ReactNode;
  variant?: IconButtonVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<IconButtonVariant, string> = {
  primary: 'bg-accent text-body hover:bg-accent-soft',
  secondary: 'bg-surface text-text-primary hover:bg-white/10',
  ghost: 'bg-transparent text-text-secondary hover:text-text-primary',
};

export function IconButton({ label, onClick, children, variant = 'secondary', className = '' }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${VARIANT_CLASSES[variant]} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
```

`src/components/ui/ProgressBar.tsx`:

```tsx
interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className="h-1 w-full overflow-hidden rounded-full bg-accent-dim"
    >
      <div className="h-full rounded-full bg-accent transition-all duration-200" style={{ width: `${percent}%` }} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/ui/ui.test.tsx`
Expected: PASS, all 8 assertions.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui
git commit -m "feat(ui): add card, chip, icon button, and progress bar primitives"
```

---

## Task 5: Fretboard View in the UI Store

**Files:**
- Modify: `src/state/ui-store.ts`
- Test: `src/state/ui-store.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `FretboardView = 'grid' | 'timeline'`, plus `fretboardView` (default `'grid'`) and `setFretboardView` on `useUiStore`. Task 9 uses them.

- [ ] **Step 1: Write the failing test**

Append to `src/state/ui-store.test.ts`:

```ts
describe('fretboard view', () => {
  it('starts on the fret grid', () => {
    expect(useUiStore.getState().fretboardView).toBe('grid');
  });

  it('switches to the timeline and back', () => {
    useUiStore.getState().setFretboardView('timeline');
    expect(useUiStore.getState().fretboardView).toBe('timeline');

    useUiStore.getState().setFretboardView('grid');
    expect(useUiStore.getState().fretboardView).toBe('grid');
  });
});
```

If the existing file resets state in a `beforeEach`, add `fretboardView: 'grid'` to that reset so the first assertion cannot pass by accident from a previous test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/state/ui-store.test.ts`
Expected: FAIL — `fretboardView` is undefined and `setFretboardView` is not a function.

- [ ] **Step 3: Extend the store**

Rewrite `src/state/ui-store.ts`:

```ts
import { create } from 'zustand';

export type TabId = 'practice' | 'exercises';
export type FretboardView = 'grid' | 'timeline';

interface UiState {
  activeTab: TabId;
  fretboardView: FretboardView;
  setActiveTab: (tab: TabId) => void;
  setFretboardView: (view: FretboardView) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTab: 'practice',
  fretboardView: 'grid',
  setActiveTab: (tab) => set({ activeTab: tab }),
  setFretboardView: (view) => set({ fretboardView: view }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/state/ui-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/ui-store.ts src/state/ui-store.test.ts
git commit -m "feat(state): track which fretboard view is active"
```

---

## Task 6: Timeline Hook

**Files:**
- Create: `src/hooks/useTimeline.ts`
- Create: `src/hooks/useTimeline.test.tsx`

**Interfaces:**
- Consumes: `buildTimeline` and `TimedNote` from Task 3; `useFretboardStore`; `useMetronomeStore`.
- Produces: `useTimeline(): TimedNote[]`. Task 9 calls it.

- [ ] **Step 1: Write the failing test**

Create `src/hooks/useTimeline.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';

vi.mock('../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { useTimeline } from './useTimeline';

describe('useTimeline', () => {
  beforeEach(() => {
    useFretboardStore.setState({
      selectedNotes: [
        { string: 6, fret: 3 },
        { string: 1, fret: 5 },
      ],
    });
    useMetronomeStore.setState({
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
    });
  });

  it('spaces the selected notes by the global subdivision', () => {
    useMetronomeStore.setState({ subdivision: 'eighth' });

    const { result } = renderHook(() => useTimeline());

    expect(result.current.map((note) => note.startBeat)).toEqual([0, 0.5]);
  });

  it('uses the global figure for every note in note mode', () => {
    const { result } = renderHook(() => useTimeline());

    expect(result.current.map((note) => note.durationBeats)).toEqual([1, 1]);
  });

  it('resolves each note duration from its own string in string mode', () => {
    useMetronomeStore.setState({
      rhythmMode: 'string',
      subdivisionByString: { 1: 'sixteenth', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'eighth' },
    });

    const { result } = renderHook(() => useTimeline());

    expect(result.current.map((note) => note.durationBeats)).toEqual([0.5, 0.25]);
    expect(result.current.map((note) => note.startBeat)).toEqual([0, 1]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/useTimeline.test.tsx`
Expected: FAIL — cannot resolve `./useTimeline`.

- [ ] **Step 3: Write the hook**

Create `src/hooks/useTimeline.ts`:

```ts
import { useMemo } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { buildTimeline } from '../domain/playback/timeline-model';
import type { TimedNote } from '../domain/playback/timeline-model';

export function useTimeline(): TimedNote[] {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const rhythmMode = useMetronomeStore((state) => state.rhythmMode);
  const subdivisionByString = useMetronomeStore((state) => state.subdivisionByString);

  return useMemo(
    () =>
      buildTimeline(selectedNotes, subdivision, (position) =>
        rhythmMode === 'string' ? subdivisionByString[position.string] : subdivision,
      ),
    [selectedNotes, subdivision, rhythmMode, subdivisionByString],
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/useTimeline.test.tsx`
Expected: PASS, all 3 tests. The third one is the important one: durations differ per string while the onsets stay a plain quarter-note grid.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTimeline.ts src/hooks/useTimeline.test.tsx
git commit -m "feat(hooks): derive the played timeline from selection and rhythm settings"
```

---

## Task 7: Timeline Roll Component

**Files:**
- Create: `src/components/fretboard/TimelineRoll.tsx`
- Create: `src/components/fretboard/TimelineRoll.test.tsx`

**Interfaces:**
- Consumes: `TimedNote` from Task 3; `STANDARD_TUNING`, `StringNumber` from `../../domain/music-theory/tuning`; `getNoteAt`, `getPitchClass` from `../../domain/music-theory/notes`.
- Produces: `TimelineRoll({ timeline, currentIndex }: { timeline: TimedNote[]; currentIndex: number | null })`. Task 9 renders it.

Layout contract, relied on by the tests: `PX_PER_BEAT = 72`, row height 48px, a 40px label gutter on the left. A note at `startBeat` sits at `left = 40 + startBeat * 72` px.

- [ ] **Step 1: Write the failing test**

Create `src/components/fretboard/TimelineRoll.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { buildTimeline } from '../../domain/playback/timeline-model';
import { TimelineRoll } from './TimelineRoll';

const timeline = buildTimeline(
  [
    { string: 6, fret: 3 },
    { string: 6, fret: 5 },
    { string: 3, fret: 7 },
  ],
  'quarter',
  () => 'quarter',
);

describe('TimelineRoll', () => {
  it('invites the student to build a sequence when nothing is selected', () => {
    render(<TimelineRoll timeline={[]} currentIndex={null} />);
    expect(screen.getByText(/monte uma sequ[eê]ncia/i)).toBeInTheDocument();
  });

  it('renders one labelled row per string', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getAllByTestId(/^timeline-string-row-/)).toHaveLength(6);
    expect(screen.getByTestId('timeline-string-row-6')).toHaveTextContent('E');
  });

  it('shows the fret number inside each note, not the note name', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getByTestId('timeline-note-0')).toHaveTextContent('3');
    expect(screen.getByTestId('timeline-note-2')).toHaveTextContent('7');
  });

  it('places each note on its own string row at its onset', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={null} />);

    const second = screen.getByTestId('timeline-note-1');
    expect(second).toHaveAttribute('data-string', '6');
    expect(second).toHaveStyle({ left: '112px' });

    const third = screen.getByTestId('timeline-note-2');
    expect(third).toHaveAttribute('data-string', '3');
    expect(third).toHaveStyle({ left: '184px' });
  });

  it('marks only the note being played as active', () => {
    render(<TimelineRoll timeline={timeline} currentIndex={1} />);

    expect(screen.getByTestId('timeline-note-1')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('timeline-note-0')).toHaveAttribute('data-active', 'false');
  });

  it('parks the playhead at the start before playback and moves it to the active note', () => {
    const { rerender } = render(<TimelineRoll timeline={timeline} currentIndex={null} />);
    expect(screen.getByTestId('timeline-playhead')).toHaveStyle({ left: '40px' });

    rerender(<TimelineRoll timeline={timeline} currentIndex={2} />);
    expect(screen.getByTestId('timeline-playhead')).toHaveStyle({ left: '184px' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/fretboard/TimelineRoll.test.tsx`
Expected: FAIL — cannot resolve `./TimelineRoll`.

- [ ] **Step 3: Write the component**

Create `src/components/fretboard/TimelineRoll.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import type { TimedNote } from '../../domain/playback/timeline-model';
import { timelineLengthInBeats } from '../../domain/playback/timeline-model';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt, getPitchClass } from '../../domain/music-theory/notes';

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];
const PX_PER_BEAT = 72;
const ROW_HEIGHT_PX = 48;
const LABEL_WIDTH_PX = 40;
const TRAILING_BEATS = 2;

interface TimelineRollProps {
  timeline: TimedNote[];
  currentIndex: number | null;
}

function beatToX(beat: number): number {
  return LABEL_WIDTH_PX + beat * PX_PER_BEAT;
}

export function TimelineRoll({ timeline, currentIndex }: TimelineRollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeNote = currentIndex !== null ? timeline[currentIndex] : undefined;
  const playheadX = beatToX(activeNote ? activeNote.startBeat : 0);
  const widthPx = beatToX(timelineLengthInBeats(timeline) + TRAILING_BEATS);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const margin = 120;
    if (playheadX < container.scrollLeft + margin || playheadX > container.scrollLeft + container.clientWidth - margin) {
      container.scrollTo({ left: Math.max(0, playheadX - margin), behavior: 'smooth' });
    }
  }, [playheadX]);

  if (timeline.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-text-secondary">
        Escolha as casas no braço para montar uma sequência.
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="relative overflow-x-auto">
      <div className="relative" style={{ width: `${widthPx}px`, height: `${STRING_ORDER.length * ROW_HEIGHT_PX}px` }}>
        {STRING_ORDER.map((string) => (
          <div
            key={string}
            data-testid={`timeline-string-row-${string}`}
            className="relative flex items-center"
            style={{ height: `${ROW_HEIGHT_PX}px` }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.06]"
            />
            <span className="relative z-10 w-10 text-center text-sm text-text-secondary">
              {getPitchClass(STANDARD_TUNING[string])}
            </span>
          </div>
        ))}

        <div
          data-testid="timeline-playhead"
          aria-hidden="true"
          className="absolute top-0 z-20 w-px bg-accent transition-all duration-100"
          style={{ left: `${playheadX}px`, height: `${STRING_ORDER.length * ROW_HEIGHT_PX}px` }}
        >
          <span className="absolute -bottom-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-b-[6px] border-x-transparent border-b-accent" />
        </div>

        {timeline.map((note) => {
          const rowIndex = STRING_ORDER.indexOf(note.position.string);
          const active = currentIndex === note.index;
          const pitch = getNoteAt(STANDARD_TUNING, note.position).pitchClass;

          return (
            <div
              key={note.index}
              data-testid={`timeline-note-${note.index}`}
              data-string={note.position.string}
              data-active={active}
              className="absolute z-30 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
              style={{
                left: `${beatToX(note.startBeat)}px`,
                top: `${rowIndex * ROW_HEIGHT_PX + ROW_HEIGHT_PX / 2}px`,
              }}
            >
              <span className="absolute -top-4 text-[10px] text-text-secondary">{pitch}</span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-200 ${
                  active
                    ? 'bg-accent text-body ring-4 ring-accent-dim'
                    : 'border border-white/20 bg-body text-text-primary'
                }`}
              >
                {note.position.fret}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/fretboard/TimelineRoll.test.tsx`
Expected: PASS, all 6 tests.

Note for the implementer: jsdom does not implement `Element.scrollTo`. If the auto-scroll effect throws in tests, guard the call with `if (typeof container.scrollTo === 'function')` rather than deleting the effect or stubbing it in the test file.

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/TimelineRoll.tsx src/components/fretboard/TimelineRoll.test.tsx
git commit -m "feat(fretboard): add the timeline roll view with a moving playhead"
```

---

## Task 8: Restyle the Fret Marker

**Files:**
- Modify: `src/components/fretboard/FretMarker.tsx`
- Test: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- Consumes: nothing new. The `FretMarkerProps` shape is unchanged.
- Produces: no API change — this is a visual task with a behavioral guarantee added to the tests.

- [ ] **Step 1: Write the failing test**

Append to `src/components/fretboard/Fretboard.test.tsx`, inside the existing `describe('Fretboard', ...)`:

```tsx
it('fills the note being played with the accent color and rings it', () => {
  useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });

  render(<Fretboard currentIndex={0} />);

  const marker = screen.getByRole('button', { name: 'corda 6, casa 1' });
  expect(marker.firstElementChild?.className).toContain('bg-accent');
  expect(marker.firstElementChild?.className).toContain('ring-accent-dim');
});

it('outlines a selected note that is not currently playing', () => {
  useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });

  render(<Fretboard currentIndex={null} />);

  const marker = screen.getByRole('button', { name: 'corda 6, casa 1' });
  expect(marker.firstElementChild?.className).toContain('border-white/20');
  expect(marker.firstElementChild?.className).not.toContain('bg-accent');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/fretboard/Fretboard.test.tsx`
Expected: FAIL on the ring assertion — the current highlighted class list has no `ring-accent-dim`.

- [ ] **Step 3: Restyle the marker**

Replace the `circleClasses` block in `src/components/fretboard/FretMarker.tsx`:

```tsx
  const circleClasses = highlighted
    ? 'bg-accent text-body ring-4 ring-accent-dim'
    : selected
      ? 'border border-white/20 bg-body text-text-primary'
      : 'border border-transparent text-transparent group-hover:border-white/20';
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/components/fretboard/Fretboard.test.tsx`
Expected: PASS, including the pre-existing tests.

- [ ] **Step 5: Soften the grid lines**

In `src/components/fretboard/Fretboard.tsx`, replace every `border-white/10` with `border-white/[0.06]` and the string line's `bg-white/10` with `bg-white/[0.06]`. Leave the inlay dot at `bg-white/10` so the position markers stay visible.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/fretboard
git commit -m "style(fretboard): fill the playing note with the accent and soften the grid"
```

---

## Task 9: Control Bar

**Files:**
- Create: `src/components/player/ControlBar.tsx`
- Create: `src/components/player/ControlBar.test.tsx`
- Modify: `src/components/metronome/MetronomeControls.tsx`

**Interfaces:**
- Consumes: `IconButton` and `Chip` from Task 4; `useNotePlayback`, `useMetronome`; `useFretboardStore`.
- Produces: `ControlBar()` — takes no props, reads its own state. Task 10 renders it.

Buttons, in order: primary play/stop (`aria-label` "Começar" / "Parar"), "Limpar seleção", "Ligar metrônomo" / "Desligar metrônomo", then the BPM chip and the existing rhythm-figure controls.

- [ ] **Step 1: Write the failing test**

Create `src/components/player/ControlBar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';

const metronome = { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} };

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome,
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { ControlBar } from './ControlBar';

describe('ControlBar', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false });
    metronome.start.mockClear();
    metronome.stop.mockClear();
  });

  it('empties the selection from the clear button', () => {
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /limpar sele[cç][aã]o/i }));

    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  it('starts the metronome, which no control did before', () => {
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /ligar metr[oô]nomo/i }));

    expect(metronome.start).toHaveBeenCalledOnce();
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
  });

  it('offers to stop the metronome once it is running', () => {
    useMetronomeStore.setState({ isPlaying: true });
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /desligar metr[oô]nomo/i }));

    expect(metronome.stop).toHaveBeenCalledOnce();
    expect(useMetronomeStore.getState().isPlaying).toBe(false);
  });

  it('steps the BPM in fives', () => {
    render(<ControlBar />);

    fireEvent.click(screen.getByRole('button', { name: /aumentar bpm/i }));
    expect(useMetronomeStore.getState().bpm).toBe(105);

    fireEvent.click(screen.getByRole('button', { name: /diminuir bpm/i }));
    expect(useMetronomeStore.getState().bpm).toBe(100);
  });

  it('keeps the rhythm figure controls available', () => {
    render(<ControlBar />);

    expect(screen.getByRole('button', { name: /por nota/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /por corda/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/player/ControlBar.test.tsx`
Expected: FAIL — cannot resolve `./ControlBar`.

- [ ] **Step 3: Strip the BPM stepper out of `MetronomeControls`**

`ControlBar` owns the BPM chip now, so remove the duplicate. In `src/components/metronome/MetronomeControls.tsx`, delete the `<div>` holding the `-` / `{bpm} BPM` / `+` buttons and drop `bpm` and `setBpm` from the `useMetronome()` destructuring. Keep the rhythm-mode toggle and the subdivision selects exactly as they are — including their `aria-pressed` attributes.

- [ ] **Step 4: Write the control bar**

Create `src/components/player/ControlBar.tsx`:

```tsx
import { Play, Square, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { Chip } from '../ui/Chip';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useFretboardStore } from '../../state/fretboard-store';

export function ControlBar() {
  const { play, stop, isPlaying } = useNotePlayback();
  const {
    bpm,
    setBpm,
    isPlaying: metronomeOn,
    start: startMetronome,
    stop: stopMetronome,
  } = useMetronome();
  const clearSelection = useFretboardStore((state) => state.clearSelection);

  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.06] pt-4">
      <IconButton
        label={isPlaying ? 'Parar' : 'Começar'}
        variant="primary"
        onClick={() => (isPlaying ? stop() : void play())}
      >
        {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </IconButton>

      <IconButton label="Limpar seleção" onClick={clearSelection}>
        <RotateCcw className="h-4 w-4" />
      </IconButton>

      <IconButton
        label={metronomeOn ? 'Desligar metrônomo' : 'Ligar metrônomo'}
        onClick={() => (metronomeOn ? stopMetronome() : void startMetronome())}
      >
        {metronomeOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </IconButton>

      <Chip>
        <button
          type="button"
          aria-label="Diminuir BPM"
          onClick={() => setBpm(bpm - 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          −
        </button>
        <span className="text-text-primary">{bpm} BPM</span>
        <button
          type="button"
          aria-label="Aumentar BPM"
          onClick={() => setBpm(bpm + 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          +
        </button>
      </Chip>

      <MetronomeControls />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/player/ControlBar.test.tsx`
Expected: PASS, all 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/player/ControlBar.tsx src/components/player/ControlBar.test.tsx src/components/metronome/MetronomeControls.tsx
git commit -m "feat(player): group playback, metronome, and tempo into one control bar"
```

---

## Task 10: Practice Panel

**Files:**
- Create: `src/components/practice/PracticePanel.tsx`
- Create: `src/components/practice/PracticePanel.test.tsx`

**Interfaces:**
- Consumes: `Card`, `Chip`, `ProgressBar` (Task 4); `useUiStore.fretboardView` (Task 5); `useTimeline` (Task 6); `TimelineRoll` (Task 7); `ControlBar` (Task 9); the existing `Fretboard`, `FretRangeControl`, `PulseIndicator`, `useFretboardSelection`, `useNotePlayback`, `useMetronome`.
- Produces: `PracticePanel()` — no props. Task 11 renders it from both tabs.

- [ ] **Step 1: Write the failing test**

Create `src/components/practice/PracticePanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { usePlaybackStore } from '../../state/playback-store';
import { useUiStore } from '../../state/ui-store';

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  sequencePlayer: { play: vi.fn(), stop: vi.fn(), onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { PracticePanel } from './PracticePanel';

describe('PracticePanel', () => {
  beforeEach(() => {
    useFretboardStore.setState({
      minFret: 1,
      maxFret: 7,
      selectedNotes: [
        { string: 6, fret: 3 },
        { string: 6, fret: 5 },
      ],
    });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false });
    usePlaybackStore.setState({ currentIndex: null, isPlaying: false });
    useUiStore.setState({ fretboardView: 'grid' });
  });

  it('shows the fret grid by default', () => {
    render(<PracticePanel />);

    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.queryByTestId('timeline-playhead')).not.toBeInTheDocument();
  });

  it('swaps the grid for the timeline roll when the view changes', () => {
    render(<PracticePanel />);

    fireEvent.click(screen.getByRole('button', { name: /linha do tempo/i }));

    expect(screen.getByTestId('timeline-playhead')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /corda \d, casa \d+/ })).not.toBeInTheDocument();
  });

  it('reports the total note count while stopped', () => {
    render(<PracticePanel />);

    const bar = screen.getByRole('progressbar', { name: /progresso/i });
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '2');
    expect(screen.getByText(/2 notas/i)).toBeInTheDocument();
  });

  it('counts the note being played, one-based, while running', () => {
    usePlaybackStore.setState({ currentIndex: 1, isPlaying: true });

    render(<PracticePanel />);

    expect(screen.getByRole('progressbar', { name: /progresso/i })).toHaveAttribute('aria-valuenow', '2');
    expect(screen.getByText(/nota 2 \/ 2/i)).toBeInTheDocument();
  });

  it('renders the control bar', () => {
    render(<PracticePanel />);
    expect(screen.getByRole('button', { name: /come[cç]ar/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/practice/PracticePanel.test.tsx`
Expected: FAIL — cannot resolve `./PracticePanel`.

- [ ] **Step 3: Write the panel**

Create `src/components/practice/PracticePanel.tsx`:

```tsx
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';
import { Fretboard } from '../fretboard/Fretboard';
import { TimelineRoll } from '../fretboard/TimelineRoll';
import { FretRangeControl } from '../fretboard/FretRangeControl';
import { PulseIndicator } from '../metronome/PulseIndicator';
import { ControlBar } from '../player/ControlBar';
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useTimeline } from '../../hooks/useTimeline';
import { useUiStore } from '../../state/ui-store';
import type { FretboardView } from '../../state/ui-store';

const VIEW_LABELS: { id: FretboardView; label: string }[] = [
  { id: 'grid', label: 'Braço' },
  { id: 'timeline', label: 'Linha do tempo' },
];

export function PracticePanel() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse } = useMetronome();
  const timeline = useTimeline();
  const fretboardView = useUiStore((state) => state.fretboardView);
  const setFretboardView = useUiStore((state) => state.setFretboardView);

  const total = timeline.length;
  const played = currentIndex === null ? 0 : currentIndex + 1;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-surface p-1 text-xs font-medium">
          {VIEW_LABELS.map((view) => (
            <button
              key={view.id}
              type="button"
              aria-pressed={fretboardView === view.id}
              onClick={() => setFretboardView(view.id)}
              className={`rounded-full px-3 py-1 transition-all duration-200 ${
                fretboardView === view.id ? 'bg-accent text-body' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          {fretboardView === 'grid' && (
            <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
          )}
          <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
        </div>
      </div>

      <div className="mb-4 flex items-center gap-3 text-xs text-text-secondary">
        <span className="whitespace-nowrap">
          {currentIndex === null ? `${total} notas` : `nota ${played} / ${total}`}
        </span>
        <ProgressBar value={played} max={total} label="Progresso da sequência" />
      </div>

      {fretboardView === 'grid' ? (
        <Fretboard currentIndex={currentIndex} />
      ) : (
        <TimelineRoll timeline={timeline} currentIndex={currentIndex} />
      )}

      <div className="mt-6">
        <ControlBar />
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/practice/PracticePanel.test.tsx`
Expected: PASS, all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/practice
git commit -m "feat(practice): add a panel that hosts both fretboard views and the controls"
```

---

## Task 11: Adopt the Panel in `App` and Delete the Duplication

**Files:**
- Modify: `src/components/layout/App.tsx`
- Modify: `src/components/layout/App.test.tsx`
- Modify: `src/components/layout/Tabs.tsx`
- Delete: `src/components/player/PlayButton.tsx`
- Delete: `src/components/player/PlayButton.test.tsx`

**Interfaces:**
- Consumes: `PracticePanel` from Task 10.
- Produces: an `App` that is only header, tabs, and section headings.

`PlayButton` is deleted because `ControlBar` replaces it and nothing else imports it. Before deleting, confirm with `grep -rn "PlayButton" src/` that only `App.tsx` and its own test reference it.

- [ ] **Step 1: Update the existing App test**

In `src/components/layout/App.test.tsx`, replace the `Reiniciar` test with the renamed control, and add a test that the panel is shared:

```tsx
it('clears the selected notes from the practice panel', () => {
  useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /limpar sele[cç][aã]o/i }));
  expect(useFretboardStore.getState().selectedNotes).toEqual([]);
});

it('shows one practice panel per tab, never two at once', () => {
  render(<App />);
  expect(screen.getAllByRole('button', { name: /come[cç]ar/i })).toHaveLength(1);

  fireEvent.click(screen.getByRole('tab', { name: /exerc[ií]cios/i }));
  expect(screen.getAllByRole('button', { name: /come[cç]ar/i })).toHaveLength(1);
});
```

Add `fretboardView: 'grid'` to the `useUiStore.setState` call in the existing `beforeEach`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/layout/App.test.tsx`
Expected: FAIL — there is no "Limpar seleção" button yet, since `App` still renders the old inline panel.

- [ ] **Step 3: Rewrite `App.tsx`**

Replace both duplicated panel blocks with `<PracticePanel />`. The whole file becomes:

```tsx
import { useEffect } from 'react';
import { PracticePanel } from '../practice/PracticePanel';
import { ExerciseList } from '../exercises/ExerciseList';
import { Tabs } from './Tabs';
import { useSamplerLoaded } from '../../hooks/useSamplerLoaded';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';
import type { TabId } from '../../state/ui-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';

const TABS: { id: TabId; label: string; badge?: number }[] = [
  { id: 'practice', label: 'Prática / Fretboard Livre' },
  { id: 'exercises', label: 'Exercícios', badge: EXERCISE_CATALOG.length },
];

export function App() {
  const samplerLoaded = useSamplerLoaded();
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  useEffect(() => {
    const preferences = loadPreferences();
    if (preferences) {
      useFretboardStore.getState().setFretRange(Math.max(1, preferences.minFret), preferences.maxFret);
      useMetronomeStore.getState().setBpm(preferences.bpm);
      useMetronomeStore.getState().setSubdivision(preferences.subdivision);
    }
    return initPersistence();
  }, []);

  return (
    <div className="min-h-screen bg-body px-8 py-6 text-text-primary">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-surface text-sm font-bold">
          GT
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Estúdio de Prática</p>
          <h1 className="text-lg font-semibold">Guitar Teacher</h1>
        </div>
      </header>

      <Tabs tabs={TABS} activeTabId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      {!samplerLoaded && (
        <p className="mt-4 text-sm text-text-secondary" role="status">
          Carregando sons...
        </p>
      )}

      {activeTab === 'practice' && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Modo Livre</p>
          <h2 className="mt-1 text-3xl font-bold">Explore o braço da guitarra.</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Escolha uma casa, encontre novas combinações e aqueça os dedos.
          </p>

          <div className="mt-6">
            <PracticePanel />
          </div>
        </section>
      )}

      {activeTab === 'exercises' && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Treino Guiado</p>
          <h2 className="mt-1 text-3xl font-bold">Continue sua evolução.</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Pratique com foco. Cada exercício foi pensado para construir sua técnica.
          </p>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row">
            <div className="lg:w-64">
              <ExerciseList />
            </div>
            <div className="flex-1">
              <PracticePanel />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Give the active tab the accent underline**

In `src/components/layout/Tabs.tsx`, change the active branch from `border-b-2 border-text-primary text-text-primary` to `border-b-2 border-accent text-text-primary`, and the container's `border-white/10` to `border-white/[0.06]`.

- [ ] **Step 5: Delete the superseded play button**

```bash
grep -rn "PlayButton" src/
git rm src/components/player/PlayButton.tsx src/components/player/PlayButton.test.tsx
```

The grep must show no importers other than the files being deleted. If anything else imports it, stop and report instead of deleting.

- [ ] **Step 6: Run the full suite and the type build**

Run: `npm test && npm run build`
Expected: all tests PASS and the build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add -A src/components
git commit -m "refactor(app): render one shared practice panel instead of duplicating it per tab"
```

---

## Task 12: Restyle the Exercise List

**Files:**
- Modify: `src/components/exercises/ExerciseList.tsx`
- Test: `src/components/exercises/ExerciseList.test.tsx`

**Interfaces:**
- Consumes: nothing new — the list items are their own small surfaces, not `Card`.
- Produces: no API change. The click handler stays on the same `<button>` and the accessible name stays the exercise name, so the two existing tests keep passing.

- [ ] **Step 1: Write the failing test**

Append inside the existing `describe('ExerciseList', ...)` in `src/components/exercises/ExerciseList.test.tsx` (`fireEvent` is already imported there):

```tsx
it('marks the active exercise with the accent border', () => {
  render(<ExerciseList />);
  const [first] = EXERCISE_CATALOG;

  const button = screen.getByText(first.name).closest('button');

  expect(button?.className).toContain('border-white/[0.06]');
  fireEvent.click(screen.getByText(first.name));
  expect(screen.getByText(first.name).closest('button')?.className).toContain('border-accent');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/exercises/ExerciseList.test.tsx`
Expected: FAIL — the idle card is `border-white/10` and the active card is `border-white/30` today.

- [ ] **Step 3: Restyle the cards**

Replace the `className` array in `src/components/exercises/ExerciseList.tsx` with:

```tsx
            className={[
              'w-full rounded-2xl border bg-card px-3 py-3 text-left transition-all duration-200',
              exercise.id === activeExerciseId
                ? 'border-accent bg-accent-dim'
                : 'border-white/[0.06] hover:border-white/20',
            ].join(' ')}
```

Nothing else in the file changes: the category label, the exercise name, `aria-pressed`, and the click handler all stay exactly as they are.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS — the new assertion and both pre-existing tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/exercises
git commit -m "style(exercises): round the exercise cards and mark the active one with the accent"
```

---

## Task 13: Visual Verification

**Files:** none — this task only looks at the running app.

- [ ] **Step 1: Build and start the dev server**

Run: `npm run build && npm run dev`
Expected: build clean; dev server on its printed URL.

- [ ] **Step 2: Check the practice tab**

Confirm, in the browser: the page background is warm near-black; the fretboard sits on a rounded card; note markers are circles that fill orange while a sequence plays; the control bar shows round buttons; the "Braço"/"Linha do tempo" toggle is present.

- [ ] **Step 3: Check the timeline view**

Select six or more notes across different strings, switch to "Linha do tempo", and press play. Confirm the notes show fret numbers, the playhead moves left to right, the active note fills orange with a halo, and the view auto-scrolls once the playhead nears the right edge.

- [ ] **Step 4: Check the exercises tab**

Switch tabs, pick an exercise, and confirm the panel is identical to the practice tab's and the selected exercise card carries the orange border.

- [ ] **Step 5: Check the metronome button**

Click "Ligar metrônomo" and confirm audible clicks and that the pulse indicator animates — this path had no UI control before this plan.

- [ ] **Step 6: Report**

Summarize what was verified. If anything looks wrong, report it rather than patching silently — a visual fix belongs in its own commit with a reason.

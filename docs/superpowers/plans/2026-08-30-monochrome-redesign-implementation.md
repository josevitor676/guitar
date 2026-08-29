# Monochrome Redesign & Astryx Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Astryx design system, restore top-tab navigation, and re-skin the whole app in a monochrome gray/white palette matching the provided reference images — including a structural fretboard redesign (flat bordered table instead of a realistic wood-textured neck) and a real "Reiniciar" action.

**Architecture:** Pure Tailwind CSS (no external component library except `lucide-react` for icons). `src/state/ui-store.ts`'s shape is unchanged — only its visual consumer changes. No changes to `src/audio/**`, `src/domain/**`, or any store's public shape except reading `fretboard-store`'s existing `clearSelection()` from a new UI control.

**Tech Stack:** React 19.2.8, Tailwind CSS v3, `lucide-react`, Zustand, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-30-monochrome-redesign-design.md`

## Global Constraints

- Remove `@astryxdesign/core`, `@astryxdesign/theme-gothic`, `@stylexjs/stylex`, `@astryxdesign/cli` entirely. Keep `lucide-react`.
- New Tailwind color tokens (via `theme.extend.colors` in `tailwind.config.ts`): `accent: '#ebebeb'`, `card: '#1b1b1b'`, `surface: '#262626'`, `body: '#1b1b1b'`, `'text-primary': '#fafafa'`, `'text-secondary': '#a1a1a1'`. Borders use `white/10`. No colored accent (no amber, no blue) anywhere in the new UI.
- Navigation goes back to top tabs (`role="tab"`), not a sidebar.
- No new tracked data (no streak counter, no session timer, no exercise difficulty/BPM metadata) — anything in the reference images requiring new persisted state is omitted.
- "Reiniciar" must be a real, working action (`useFretboardStore.getState().clearSelection()`), not decorative.
- No changes to `src/audio/**`, `src/domain/**`, `src/state/fretboard-store.ts`'s shape, `src/state/metronome-store.ts`, `src/state/playback-store.ts`, or `src/state/ui-store.ts`'s shape.

---

## Task 1: Remove Astryx, Add New Palette, Recreate Tabs, Wire Navigation

**Files:**
- Modify: `package.json` (via npm uninstall)
- Modify: `tailwind.config.ts`
- Modify: `src/index.css`
- Modify: `src/test/setup.ts`
- Delete: `src/components/layout/AppSidebar.tsx`
- Delete: `src/components/layout/AppSidebar.test.tsx`
- Create: `src/components/layout/Tabs.tsx`
- Create: `src/components/layout/Tabs.test.tsx`
- Modify: `src/components/layout/App.tsx`
- Modify: `src/components/layout/App.test.tsx`

**Interfaces:**
- Consumes: `useUiStore`, `TabId` from `../../state/ui-store` (unchanged).
- Produces: `<Tabs tabs={{id: string; label: string; badge?: number}[]} activeTabId={string} onChange={(id: string) => void} />`. Used only by `App.tsx` in this task; later tasks don't touch it.

- [ ] **Step 1: Remove the Astryx dependencies**

```bash
npm uninstall @astryxdesign/core @astryxdesign/theme-gothic @stylexjs/stylex @astryxdesign/cli
```

Verify `package.json` no longer lists any `@astryxdesign/*` package or `@stylexjs/stylex`. `lucide-react` must remain.

- [ ] **Step 2: Revert the Tailwind config and CSS**

Replace `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#ebebeb',
        card: '#1b1b1b',
        surface: '#262626',
        body: '#1b1b1b',
        'text-primary': '#fafafa',
        'text-secondary': '#a1a1a1',
      },
    },
  },
  plugins: [],
} satisfies Config
```

Replace `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Replace `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Delete the sidebar**

```bash
rm src/components/layout/AppSidebar.tsx src/components/layout/AppSidebar.test.tsx
```

- [ ] **Step 4: Write the failing tests for the new Tabs component**

`src/components/layout/Tabs.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const TABS = [
  { id: 'practice', label: 'Prática / Fretboard Livre' },
  { id: 'exercises', label: 'Exercícios', badge: 4 },
];

describe('Tabs', () => {
  it('renders every tab label', () => {
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Prática \/ Fretboard Livre/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Exerc[ií]cios/ })).toBeInTheDocument();
  });

  it('renders the zero-padded badge count when provided', () => {
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={vi.fn()} />);
    expect(screen.getByText('04')).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={TABS} activeTabId="exercises" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Exerc[ií]cios/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Prática \/ Fretboard Livre/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Exerc[ií]cios/ }));
    expect(onChange).toHaveBeenCalledWith('exercises');
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npm run test -- Tabs`
Expected: FAIL — `Tabs.tsx` does not exist yet.

- [ ] **Step 6: Implement Tabs.tsx**

`src/components/layout/Tabs.tsx`:

```tsx
interface Tab {
  id: string;
  label: string;
  badge?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTabId: string;
  onChange: (id: string) => void;
}

export function Tabs({ tabs, activeTabId, onChange }: TabsProps) {
  return (
    <div role="tablist" className="flex items-center gap-8 border-b border-white/10 pb-3">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === activeTabId}
          onClick={() => onChange(tab.id)}
          className={[
            'flex items-center gap-2 pb-3 text-sm font-semibold transition-all duration-200',
            tab.id === activeTabId
              ? 'border-b-2 border-text-primary text-text-primary'
              : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {tab.label}
          {typeof tab.badge === 'number' && (
            <span className="rounded bg-surface px-1.5 py-0.5 text-xs text-text-primary">
              {String(tab.badge).padStart(2, '0')}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm run test -- Tabs`
Expected: PASS

- [ ] **Step 8: Replace App.test.tsx**

Replace the full contents of `src/components/layout/App.test.tsx`. This removes the Astryx theme-attribute test (Astryx is being removed in this task, so that behavior no longer exists) and switches sidebar-button queries back to `role="tab"`:

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
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    expect(screen.queryByText(/continue sua evolu[cç][aã]o/i)).not.toBeInTheDocument();
  });

  it('shows the exercise list and fretboard together after switching to the exercises tab', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('tab', { name: /exerc[ií]cios/i }));
    expect(screen.getByText(/continue sua evolu[cç][aã]o/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
  });

  it('shows the exercise count badge on the Exercícios tab', () => {
    render(<App />);
    expect(screen.getByText('04')).toBeInTheDocument();
  });

  it('clamps a stale persisted minFret of 0 to 1 instead of restoring fret 0', () => {
    localStorage.setItem(
      'guitar-teacher:preferences',
      JSON.stringify({ bpm: 100, subdivision: 'quarter', minFret: 0, maxFret: 7 }),
    );

    render(<App />);

    expect(screen.queryByRole('button', { name: /casa 0$/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run the test to verify it fails**

Run: `npm run test -- App`
Expected: FAIL — the current `App.tsx` still imports from `@astryxdesign/*` (now uninstalled) and renders `<AppSidebar>` (now deleted), and the exercises tab has no "Continue sua evolução." heading yet.

- [ ] **Step 10: Implement App.tsx**

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
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';

const TABS: { id: TabId; label: string; badge?: number }[] = [
  { id: 'practice', label: 'Prática / Fretboard Livre' },
  { id: 'exercises', label: 'Exercícios', badge: EXERCISE_CATALOG.length },
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
      useFretboardStore.getState().setFretRange(Math.max(1, preferences.minFret), preferences.maxFret);
      useMetronomeStore.getState().setBpm(preferences.bpm);
      useMetronomeStore.getState().setSubdivision(preferences.subdivision);
    }
    return initPersistence();
  }, []);

  return (
    <div className="min-h-screen bg-body px-8 py-6 text-text-primary">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center border border-white/20 text-sm font-bold">
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

          <div className="mt-6 rounded border border-white/10 bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
              <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
            </div>

            <Fretboard currentIndex={currentIndex} />

            <div className="mt-6 flex items-center gap-6">
              <PlayButton />
              <MetronomeControls />
            </div>
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

            <div className="flex-1 rounded border border-white/10 bg-card p-6">
              <Fretboard currentIndex={currentIndex} />

              <div className="mt-6 flex items-center gap-6">
                <PlayButton />
                <MetronomeControls />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 11: Run the tests to verify they pass**

Run: `npm run test -- App`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite — `AppSidebar.test.tsx` is gone, so those tests no longer run; every other file is unaffected by this task except `App.test.tsx`/`Tabs.test.tsx`)

Run: `npm run build`
Expected: PASS (no more `@astryxdesign/*` imports anywhere)

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: remove Astryx, restore top tabs, apply monochrome palette"
```

---

## Task 2: Fretboard — Flat Bordered Table Layout

**Files:**
- Modify: `src/components/fretboard/Fretboard.tsx`
- Modify: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- No prop change to `Fretboard` or `FretMarker` — `FretMarker` is not touched in this task (its own restyle is Task 3). This task only changes `Fretboard.tsx`'s layout: it removes the wood-gradient background and the absolutely-positioned string-line/fret-line decorative layers from the last two redesigns, replacing them with a literal bordered table (a fret-number header row, and `border-b`/`border-r` on rows/cells).

- [ ] **Step 1: Update the test**

In `src/components/fretboard/Fretboard.test.tsx`, replace the test named `'renders a vertical fret-line marker after every visible fret'` with a test for the new fret-number header row:

```tsx
  it('renders a fret-number header row above the grid', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getByTestId('fret-number-1')).toHaveTextContent('1');
    expect(screen.getByTestId('fret-number-7')).toHaveTextContent('7');
  });
```

Leave every other test in the file untouched — the string-order test, the inlay test, the two glow tests, and the circular-marker test all still apply (they don't depend on the wood background or the old floating-line layer).

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- Fretboard`
Expected: FAIL — no `data-testid="fret-number-*"` elements exist yet; the old `fret-line-*` test you just removed would have passed against the current code, confirming you're replacing (not chasing) the old behavior.

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
const INLAY_FRETS = new Set([3, 5, 7]);
const LABEL_WIDTH_PX = 40;
const FRET_CELL_WIDTH_PX = 56;
const ROW_HEIGHT_PX = 48;

interface FretboardProps {
  currentIndex: number | null;
}

export function Fretboard({ currentIndex }: FretboardProps) {
  const { minFret, maxFret, selectedNotes, toggleNote } = useFretboardSelection();
  const frets = Array.from({ length: maxFret - minFret + 1 }, (_, i) => minFret + i);
  const highlightedPosition = currentIndex !== null ? selectedNotes[currentIndex] : undefined;
  const gridHeightPx = STRING_ORDER.length * ROW_HEIGHT_PX;

  return (
    <div className="relative inline-block">
      <div className="flex items-center border-b border-white/10 pb-1 text-xs text-text-secondary">
        <span className="w-10" />
        {frets.map((fret) => (
          <span key={fret} data-testid={`fret-number-${fret}`} className="flex w-14 items-center justify-center">
            {fret}
          </span>
        ))}
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {frets.map((fret, index) =>
            INLAY_FRETS.has(fret) ? (
              <span
                key={`inlay-${fret}`}
                data-testid={`inlay-fret-${fret}`}
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10"
                style={{
                  left: `${LABEL_WIDTH_PX + index * FRET_CELL_WIDTH_PX + FRET_CELL_WIDTH_PX / 2}px`,
                  top: `${gridHeightPx / 2}px`,
                }}
              />
            ) : null,
          )}
        </div>

        <div className="relative z-10">
          {STRING_ORDER.map((string) => (
            <div
              key={string}
              className="flex items-center border-b border-white/10"
              style={{ height: `${ROW_HEIGHT_PX}px` }}
            >
              <span className="w-10 text-center text-sm text-text-secondary">
                {getPitchClass(STANDARD_TUNING[string])}
              </span>
              {frets.map((fret) => {
                const position = { string, fret };
                const selected = selectedNotes.some((note) => positionsEqual(note, position));
                const highlighted = !!highlightedPosition && positionsEqual(highlightedPosition, position);
                const note = getNoteAt(STANDARD_TUNING, position);
                return (
                  <div key={fret} className="border-r border-white/10">
                    <FretMarker
                      string={string}
                      fret={fret}
                      selected={selected}
                      highlighted={highlighted}
                      noteLabel={note.pitchClass}
                      onClick={() => toggleNote(position)}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

Note: the per-fret cell is now wrapped in a `<div className="border-r border-white/10">` instead of rendering `FretMarker` directly — this gives every cell a right border (completing the table grid together with each row's `border-b`) without needing to touch `FretMarker.tsx` in this task. `FretMarker` itself is passed the exact same props as before.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- Fretboard`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/Fretboard.tsx src/components/fretboard/Fretboard.test.tsx
git commit -m "style(fretboard): replace realistic neck with a flat bordered table layout"
```

---

## Task 3: FretMarker — Outline Selected, Accent-Filled Highlighted

**Files:**
- Modify: `src/components/fretboard/FretMarker.tsx`
- Modify: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- No prop change to `FretMarker` — same `{ string, fret, selected, highlighted, noteLabel, onClick }`, same `aria-label`/`aria-pressed`/`onClick` on the root button.

- [ ] **Step 1: Update the tests**

In `src/components/fretboard/Fretboard.test.tsx`, replace the two tests named `'applies a glow/ring style to a selected fret marker'` and `'applies a stronger glow to the currently highlighted marker during playback'`:

```tsx
  it('renders a hollow white outline (no fill) for a selected fret marker', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/border-white\/40/);
  });

  it('fills the currently highlighted marker with the accent color during playback', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={0} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/bg-accent/);
  });
```

Leave the test named `'renders the fret marker as a circular button'` (checks `rounded-full`) untouched — it still applies.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- Fretboard`
Expected: FAIL — the current `FretMarker` still uses `bg-amber-400`/`ring-2`/`shadow-` classes, not `border-white/40`/`bg-accent`.

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
  const circleClasses = highlighted
    ? 'border border-accent bg-accent text-body'
    : selected
      ? 'border border-white/40 text-text-primary'
      : 'border border-transparent text-transparent group-hover:border-white/20';

  return (
    <button
      type="button"
      aria-label={`corda ${string}, casa ${fret}`}
      aria-pressed={selected}
      onClick={onClick}
      className="group flex h-12 w-14 items-center justify-center transition-all duration-200"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-200 ${circleClasses}`}
      >
        {selected ? noteLabel : ''}
      </span>
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
git commit -m "style(fretboard): redesign markers as outlined circles with accent-filled highlight"
```

---

## Task 4: Control Bar — Rename Play, Restyle Pulse Indicator, Add Metronome Status and Real Reiniciar

**Files:**
- Modify: `src/components/player/PlayButton.tsx`
- Modify: `src/components/player/PlayButton.test.tsx`
- Modify: `src/components/metronome/PulseIndicator.tsx`
- Modify: `src/components/metronome/PulseIndicator.test.tsx`
- Modify: `src/components/layout/App.tsx`
- Modify: `src/components/layout/App.test.tsx`

**Interfaces:**
- No prop change to `PlayButton` or `PulseIndicator`.
- `App.tsx` gains a real "Reiniciar" action wired to `useFretboardStore.getState().clearSelection()` (already an existing store method — no store change).

- [ ] **Step 1: Update PlayButton's test**

Replace the test in `src/components/player/PlayButton.test.tsx` (the label changes from "Play" to "Começar"):

```tsx
  it('shows "Começar" initially and starts playback on click', async () => {
    render(<PlayButton />);
    const button = screen.getByRole('button', { name: /come[cç]ar/i });
    await fireEvent.click(button);
    expect(play).toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- PlayButton`
Expected: FAIL — the current button says "Play", not "Começar".

- [ ] **Step 3: Implement PlayButton**

Replace the full contents of `src/components/player/PlayButton.tsx`:

```tsx
import { Play, Square } from 'lucide-react';
import { useNotePlayback } from '../../hooks/useNotePlayback';

export function PlayButton() {
  const { play, stop, isPlaying } = useNotePlayback();

  return (
    <button
      type="button"
      onClick={() => (isPlaying ? stop() : play())}
      className="flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-semibold text-body transition-all duration-200 hover:opacity-90 active:scale-95"
    >
      {isPlaying ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {isPlaying ? 'Parar' : 'Começar'}
    </button>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- PlayButton`
Expected: PASS

- [ ] **Step 5: Update PulseIndicator's test**

Replace both assertions in `src/components/metronome/PulseIndicator.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PulseIndicator } from './PulseIndicator';

describe('PulseIndicator', () => {
  it('is dim when not playing', () => {
    render(<PulseIndicator currentPulse={0} isPlaying={false} />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-white/10');
  });

  it('is lit when playing', () => {
    render(<PulseIndicator currentPulse={2} isPlaying />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-accent');
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm run test -- PulseIndicator`
Expected: FAIL — the current component uses `bg-zinc-700`/`bg-amber-400`.

- [ ] **Step 7: Implement PulseIndicator**

Replace the full contents of `src/components/metronome/PulseIndicator.tsx`:

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
      className={`h-4 w-4 rounded-full transition-all duration-200 ${isPlaying ? 'bg-accent' : 'bg-white/10'}`}
    />
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm run test -- PulseIndicator`
Expected: PASS

- [ ] **Step 9: Add the "Reiniciar" regression test to App.test.tsx**

Add to `src/components/layout/App.test.tsx` (new test in the existing `describe('App', ...)` block):

```tsx
  it('clears the selected notes when Reiniciar is clicked', () => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 1 }] });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /reiniciar/i }));
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });
```

- [ ] **Step 10: Run the test to verify it fails**

Run: `npm run test -- App`
Expected: FAIL — there is no "Reiniciar" button in `App.tsx` yet.

- [ ] **Step 11: Add the metronome-status row and Reiniciar button to App.tsx**

In `src/components/layout/App.tsx`, add the import:

```tsx
import { Volume2, RotateCcw } from 'lucide-react';
```

Then, in BOTH the `practice` and `exercises` tab-content blocks, replace:

```tsx
            <div className="mt-6 flex items-center gap-6">
              <PlayButton />
              <MetronomeControls />
            </div>
```

with:

```tsx
            <div className="mt-6">
              <div className="flex items-center gap-6">
                <PlayButton />
                <MetronomeControls />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-sm text-text-secondary">
                <span className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Metrônomo ativo
                </span>
                <button
                  type="button"
                  onClick={() => useFretboardStore.getState().clearSelection()}
                  className="flex items-center gap-2 transition-all duration-200 hover:text-text-primary"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reiniciar
                </button>
              </div>
            </div>
```

(This block appears twice in the file — once inside the `practice` section, once inside the `exercises` section — apply the same replacement both times.)

- [ ] **Step 12: Run the tests to verify they pass**

Run: `npm run test -- App`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

Run: `npm run build`
Expected: PASS

- [ ] **Step 13: Commit**

```bash
git add src/components/player/PlayButton.tsx src/components/player/PlayButton.test.tsx \
  src/components/metronome/PulseIndicator.tsx src/components/metronome/PulseIndicator.test.tsx \
  src/components/layout/App.tsx src/components/layout/App.test.tsx
git commit -m "feat(controls): rename Play to Começar, restyle pulse indicator, add working Reiniciar"
```

---

## Task 5: FretRangeControl and MetronomeControls — Chip Restyle

**Files:**
- Modify: `src/components/fretboard/FretRangeControl.tsx`
- Modify: `src/components/metronome/MetronomeControls.tsx`

**Interfaces:**
- No prop or logic change to either component — pure `className` restyle. Both components' existing tests query by role/text content only, never by class, so no test file changes are needed in this task.

- [ ] **Step 1: Implement FretRangeControl**

Replace the full contents of `src/components/fretboard/FretRangeControl.tsx`:

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
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1 text-xs font-medium">
      <button
        type="button"
        onClick={goToPrevious}
        className="text-text-secondary transition-all duration-200 hover:text-text-primary"
      >
        Anterior
      </button>
      <span className="text-text-primary">
        Casas {minFret}-{maxFret}
      </span>
      <button
        type="button"
        onClick={goToNext}
        className="text-text-secondary transition-all duration-200 hover:text-text-primary"
      >
        Próximo
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Run FretRangeControl's tests to confirm they still pass**

Run: `npm run test -- FretRangeControl`
Expected: PASS (unchanged logic, tests query by role/name only)

- [ ] **Step 3: Implement MetronomeControls**

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
    <div className="flex items-center gap-4 text-sm text-text-secondary">
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-surface px-3 py-1">
        <button
          type="button"
          onClick={() => setBpm(bpm - 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          -
        </button>
        <span className="text-text-primary">{bpm} BPM</span>
        <button
          type="button"
          onClick={() => setBpm(bpm + 5)}
          className="text-text-primary transition-all duration-200 hover:opacity-70"
        >
          +
        </button>
      </div>

      <label className="flex items-center gap-2">
        Figura rítmica
        <select
          value={subdivision}
          onChange={(event) => setSubdivision(event.target.value as Subdivision)}
          className="rounded-full border border-white/10 bg-surface px-2 py-1 text-text-primary transition-all duration-200"
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

- [ ] **Step 4: Run MetronomeControls' tests to confirm they still pass**

Run: `npm run test -- MetronomeControls`
Expected: PASS (unchanged logic, tests query by role/name/text only)

Run: `npm run test`
Expected: PASS (full suite)

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/FretRangeControl.tsx src/components/metronome/MetronomeControls.tsx
git commit -m "style(controls): restyle fret-range and metronome controls as monochrome chips"
```

---

## Task 6: ExerciseList — Card Restyle

**Files:**
- Modify: `src/components/exercises/ExerciseList.tsx`

**Interfaces:**
- No prop or logic change — pure `className` restyle. The existing test queries `getByText(exercise.name)` and click behavior only, both of which are unaffected by wrapping the name in a nested `<span>` (React Testing Library's `getByText` searches recursively).

- [ ] **Step 1: Implement**

Replace the full contents of `src/components/exercises/ExerciseList.tsx`:

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
              'w-full rounded border bg-card px-3 py-3 text-left transition-all duration-200',
              exercise.id === activeExerciseId ? 'border-white/30' : 'border-white/10 hover:border-white/20',
            ].join(' ')}
          >
            <span className="block text-xs uppercase tracking-wide text-text-secondary">
              {CATEGORY_LABELS[exercise.category]}
            </span>
            <span className="mt-1 block text-sm font-semibold text-text-primary">{exercise.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `npm run test -- ExerciseList`
Expected: PASS (unchanged logic; `getByText(exercise.name)` still finds the name inside the nested span)

Run: `npm run test`
Expected: PASS (full suite)

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/exercises/ExerciseList.tsx
git commit -m "style(exercises): restyle exercise cards to match the monochrome palette"
```

---

## Self-Review Notes

- **Spec coverage:** Astryx removal + palette (Task 1), top-tab navigation with real badge count (Task 1), fretboard table redesign (Task 2), outline/accent marker style (Task 3), renamed Play button + real Reiniciar + metronome status text (Task 4), and the remaining chip/card restyles (Tasks 5-6) all map directly to the spec's sections 3-8.
- **Deliberate, visible removals — not silent drops:** Task 1 explicitly calls out removing the Astryx theme-attribute test (the feature it tested no longer exists) rather than letting it disappear inside an unrelated full-file replacement — this addresses the exact class of gap the previous refactor's final review caught (a silently-dropped regression test).
- **Type/interface consistency verified:** `Tabs`' props (`tabs`, `activeTabId`, `onChange`) are defined once in Task 1 and never touched again; `FretMarker`'s props are unchanged across Tasks 2-3 despite both tasks touching files that reference it.
- **Out of scope confirmed absent from every task:** no streak counter, no session timer, no exercise difficulty/BPM metadata, no changes to `src/audio/**`, `src/domain/**`, or any store's public shape — matching the spec's Section 10. The only store interaction added is a call to `fretboard-store`'s pre-existing `clearSelection()`.

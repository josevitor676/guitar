# Astryx/Gothic Refactor & Audio Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the app's hand-rolled navigation and chrome with the Astryx design system (Gothic theme), redesign the fretboard's note markers as centered circles with visible string/fret lines, and fix two playback-ordering issues in the audio hook layer.

**Architecture:** Astryx components (`SideNav`, `Theme`) own navigation and app chrome; the existing Tailwind setup is kept only for the Fretboard's bespoke visualization. No changes to `src/audio/**`, `src/domain/**`, or any store's public shape except the two specific `useNotePlayback` fixes in Tasks 6-7.

**Tech Stack:** React 19.2.8 (already satisfies Astryx's peer requirement — no upgrade needed), `@astryxdesign/core` + `@astryxdesign/theme-gothic` (Meta's real, verified `facebook/astryx` open-source design system), `@stylexjs/stylex` (peer dep), `lucide-react` (for the two icons Astryx's semantic set doesn't cover), existing Tailwind CSS, Zustand, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-astryx-gothic-refactor-design.md`

## Global Constraints

- Only install the **scoped** packages: `@astryxdesign/core`, `@astryxdesign/theme-gothic`, `@astryxdesign/cli`, `@stylexjs/stylex`. **Never** install the bare `astryx` package from npm — it belongs to an unrelated individual, not Meta, and is not part of this design system.
- Theme provider is `Theme`, imported from `@astryxdesign/core/theme` (not `XDSTheme` — verified against the actual exported symbol in the library's source).
- Gothic theme object is `gothicTheme`, imported from `@astryxdesign/theme-gothic/built`. It is dark-only; always pass `mode="dark"` to `<Theme>`.
- Astryx components handle navigation/chrome. The existing Tailwind setup (`tailwind.config.ts`, `src/index.css`) is preserved and used **only** inside `src/components/fretboard/**` going forward — do not introduce new Tailwind-only chrome components.
- No changes to `src/audio/**`, `src/domain/**`, `src/state/fretboard-store.ts`, `src/state/metronome-store.ts`, or `src/state/persistence.ts` anywhere in this plan.
- `src/state/ui-store.ts` keeps its exact current shape (`activeTab: 'practice' | 'exercises'`, `setActiveTab`) — only its visual consumer changes from `Tabs` to the new sidebar.
- Do not reactivate the metronome start/stop button (removed in a prior refactor) — out of scope here.

---

## Task 1: Install Astryx + Gothic Theme, Wrap App in Theme Provider

**Files:**
- Modify: `package.json` (via npm install)
- Modify: `src/index.css`
- Modify: `src/components/layout/App.tsx`
- Modify: `src/components/layout/App.test.tsx`

**Interfaces:**
- Produces: `<Theme theme={gothicTheme} mode="dark">` wrapping the whole app. Used by every subsequent task that touches `App.tsx` (Task 3) or relies on Astryx components rendering inside a themed tree (Task 2).

- [ ] **Step 1: Install dependencies**

```bash
npm install @astryxdesign/core @astryxdesign/theme-gothic @stylexjs/stylex lucide-react
npm install -D @astryxdesign/cli
```

Verify `package.json`'s `dependencies` now lists `@astryxdesign/core`, `@astryxdesign/theme-gothic`, `@stylexjs/stylex`, `lucide-react`, and `devDependencies` lists `@astryxdesign/cli`. Do **not** install a package named bare `astryx` — if `npm install` ever resolves one under that exact name, stop and report it, since that name belongs to an unrelated npm publisher, not this design system.

- [ ] **Step 2: Write the failing test**

Add to `src/components/layout/App.test.tsx` (new test in the existing `describe('App', ...)` block — do not remove any existing test in this task):

```tsx
  it('applies the gothic dark theme to the document root', () => {
    render(<App />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test -- App`
Expected: FAIL — `App.tsx` doesn't render a `<Theme>` yet, so `document.documentElement` has no `data-theme` attribute.

- [ ] **Step 4: Add the CSS imports**

Replace the full contents of `src/index.css`:

```css
@import '@astryxdesign/core/reset.css';
@import '@astryxdesign/core/astryx.css';
@import '@astryxdesign/theme-gothic/theme.css';

@tailwind base;
@tailwind components;
@tailwind utilities;
```

(This project uses Tailwind v3, not v4, so the `@layer`/`@import ... layer(...)` bridge shown in Astryx's own Tailwind-v4-oriented docs does not apply here. Importing Astryx's three CSS files before the three `@tailwind` directives gives the correct cascade — Astryx's reset and component base styles load first, theme tokens next, and Tailwind's own utilities still win last for anything using Tailwind classes, which is what the Fretboard needs.)

- [ ] **Step 5: Wrap `App.tsx` in the Theme provider**

In `src/components/layout/App.tsx`, add two imports at the top:

```tsx
import { Theme } from '@astryxdesign/core/theme';
import { gothicTheme } from '@astryxdesign/theme-gothic/built';
```

Then wrap the existing returned JSX (the outer `<div className="min-h-screen ...">...</div>`, with all of its current children — the `<h1>`, the "Carregando sons..." paragraph, `<Tabs>`, and both tab-content blocks — completely unchanged) in `<Theme theme={gothicTheme} mode="dark">`:

```tsx
  return (
    <Theme theme={gothicTheme} mode="dark">
      <div className="min-h-screen bg-zinc-950 p-6 font-medium tracking-wide text-zinc-100">
        {/* ...all existing JSX from the current file, unchanged... */}
      </div>
    </Theme>
  );
```

Do not change anything else in this file in this task — no layout, no `Tabs` removal, no sidebar. That is Task 3.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm run test -- App`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite, no regressions)

Run: `npm run build`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/index.css src/components/layout/App.tsx src/components/layout/App.test.tsx
git commit -m "feat: install Astryx design system and wrap app in the Gothic theme"
```

---

## Task 2: AppSidebar Component (Astryx SideNav)

**Files:**
- Create: `src/components/layout/AppSidebar.tsx`
- Create: `src/components/layout/AppSidebar.test.tsx`

**Interfaces:**
- Consumes: `useUiStore`, `TabId` from `../../state/ui-store` (unchanged, already exists); `SideNav`, `SideNavItem` from `@astryxdesign/core/SideNav` (Task 1's install); `Guitar`, `BookOpen` from `lucide-react` (Task 1's install).
- Produces: `<AppSidebar />` — a self-contained, prop-less component. Used by Task 3 (`App.tsx`).

- [ ] **Step 1: Write the failing tests**

`src/components/layout/AppSidebar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useUiStore } from '../../state/ui-store';
import { AppSidebar } from './AppSidebar';

describe('AppSidebar', () => {
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'practice' });
  });

  it('renders both navigation items', () => {
    render(<AppSidebar />);
    expect(screen.getByRole('button', { name: 'Prática Livre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exercícios' })).toBeInTheDocument();
  });

  it('marks the active tab as the current page', () => {
    render(<AppSidebar />);
    expect(screen.getByRole('button', { name: 'Prática Livre' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Exercícios' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('switches tabs when a different item is clicked', () => {
    render(<AppSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Exercícios' }));
    expect(useUiStore.getState().activeTab).toBe('exercises');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- AppSidebar`
Expected: FAIL — `AppSidebar.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/components/layout/AppSidebar.tsx`:

```tsx
import { Guitar, BookOpen } from 'lucide-react';
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav';
import { useUiStore } from '../../state/ui-store';
import type { TabId } from '../../state/ui-store';

export function AppSidebar() {
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  const selectTab = (tab: TabId) => () => setActiveTab(tab);

  return (
    <SideNav collapsible={true}>
      <SideNavItem
        label="Prática Livre"
        icon={Guitar}
        isSelected={activeTab === 'practice'}
        onClick={selectTab('practice')}
      />
      <SideNavItem
        label="Exercícios"
        icon={BookOpen}
        isSelected={activeTab === 'exercises'}
        onClick={selectTab('exercises')}
      />
    </SideNav>
  );
}
```

If `Guitar` or `BookOpen` is not exported by the installed version of `lucide-react` (check `node_modules/lucide-react/dist/lucide-react.d.ts` or the package's own docs if the build fails with an import error), substitute the closest available icon names (e.g. `Music` for Guitar, `Book` for BookOpen) — keep the rest of the component identical.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- AppSidebar`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppSidebar.tsx src/components/layout/AppSidebar.test.tsx
git commit -m "feat(nav): add collapsible AppSidebar using Astryx SideNav"
```

---

## Task 3: Wire Sidebar into App, Remove Tabs

**Files:**
- Modify: `src/components/layout/App.tsx`
- Modify: `src/components/layout/App.test.tsx`
- Delete: `src/components/layout/Tabs.tsx`
- Delete: `src/components/layout/Tabs.test.tsx`

**Interfaces:**
- Consumes: `AppSidebar` (Task 2).
- Produces: no external change — `App` still takes no props.

- [ ] **Step 1: Replace the test file**

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

  it('applies the gothic dark theme to the document root', () => {
    render(<App />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('renders the practice tab by default with the fretboard, play button, and metronome controls', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /exerc[ií]cios/i })).not.toBeInTheDocument();
  });

  it('shows the exercise list and fretboard together after selecting Exercícios in the sidebar', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Exercícios' }));
    expect(screen.getByRole('heading', { name: /exerc[ií]cios/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- App`
Expected: FAIL — the current `App.tsx` still renders `<Tabs>` (`role="tab"`), not sidebar buttons named "Exercícios"/"Prática Livre".

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/layout/App.tsx`:

```tsx
import { useEffect } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { gothicTheme } from '@astryxdesign/theme-gothic/built';
import { Fretboard } from '../fretboard/Fretboard';
import { FretRangeControl } from '../fretboard/FretRangeControl';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { PulseIndicator } from '../metronome/PulseIndicator';
import { PlayButton } from '../player/PlayButton';
import { ExerciseList } from '../exercises/ExerciseList';
import { AppSidebar } from './AppSidebar';
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useSamplerLoaded } from '../../hooks/useSamplerLoaded';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';

export function App() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse } = useMetronome();
  const samplerLoaded = useSamplerLoaded();
  const activeTab = useUiStore((state) => state.activeTab);

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
    <Theme theme={gothicTheme} mode="dark">
      <div className="flex min-h-screen bg-zinc-950 text-zinc-100">
        <AppSidebar />

        <main className="flex-1 p-6 font-medium tracking-wide">
          <h1 className="mb-6 text-2xl font-bold tracking-wide">Guitar Teacher</h1>

          {!samplerLoaded && (
            <p className="mb-4 text-sm text-amber-400" role="status">
              Carregando sons...
            </p>
          )}

          {activeTab === 'practice' && (
            <div>
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
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="lg:w-64">
                <h2 className="mb-2 text-lg font-semibold tracking-wide">Exercícios</h2>
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
        </main>
      </div>
    </Theme>
  );
}
```

- [ ] **Step 4: Delete the Tabs component and its test**

```bash
rm src/components/layout/Tabs.tsx src/components/layout/Tabs.test.tsx
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm run test -- App`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite — `Tabs.test.tsx` is gone, so its tests no longer run at all; every other test file is unaffected)

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(nav): replace top tabs with the Astryx sidebar"
```

---

## Task 4: Fretboard — Fret-Line Layer and Centered String Lines

**Files:**
- Modify: `src/components/fretboard/Fretboard.tsx`
- Modify: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- No prop or logic change — pure structural/visual rework, laying the groundwork for Task 5's circular markers.

- [ ] **Step 1: Write the failing test**

Add to `src/components/fretboard/Fretboard.test.tsx` (new test in the existing `describe` block):

```tsx
  it('renders a vertical fret-line marker after every visible fret', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getByTestId('fret-line-1')).toBeInTheDocument();
    expect(screen.getByTestId('fret-line-7')).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- Fretboard`
Expected: FAIL — no `data-testid="fret-line-*"` elements exist yet.

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

const STRING_LINE_HEIGHT: Record<StringNumber, string> = {
  1: 'h-[1px]',
  2: 'h-[1.4px]',
  3: 'h-[1.8px]',
  4: 'h-[2.2px]',
  5: 'h-[2.6px]',
  6: 'h-[3px]',
};

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

  return (
    <div className="relative inline-block border-l-4 border-zinc-300 bg-gradient-to-b from-[#2b1d14] to-[#1a120c]">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
        {frets.map((fret, index) =>
          INLAY_FRETS.has(fret) ? (
            <span
              key={`inlay-${fret}`}
              data-testid={`inlay-fret-${fret}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-zinc-100/10"
              style={{ left: `${LABEL_WIDTH_PX + index * FRET_CELL_WIDTH_PX + FRET_CELL_WIDTH_PX / 2}px` }}
            />
          ) : null,
        )}
        {frets.map((fret, index) => (
          <span
            key={`fret-line-${fret}`}
            data-testid={`fret-line-${fret}`}
            className="absolute top-0 bottom-0 w-px bg-zinc-400/50"
            style={{ left: `${LABEL_WIDTH_PX + (index + 1) * FRET_CELL_WIDTH_PX}px` }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {STRING_ORDER.map((string) => (
          <div key={string} className="relative flex items-center" style={{ height: `${ROW_HEIGHT_PX}px` }}>
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 top-1/2 -translate-y-1/2 bg-zinc-300/70 ${STRING_LINE_HEIGHT[string]}`}
            />
            <span className="relative z-10 w-10 text-center text-sm text-zinc-400">
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

Note: `FretMarker` in this task's tree still renders exactly as it did before (unchanged in this task — the rectangular button from the prior refactor). Its cell will look slightly taller now (`ROW_HEIGHT_PX = 48` vs. the previous implicit `h-10` = 40px row height) since `FretMarker` itself is still `h-10`; that's fine and expected — Task 5 makes `FretMarker` match the new 48px row height as part of its own circular redesign.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- Fretboard`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard/Fretboard.tsx src/components/fretboard/Fretboard.test.tsx
git commit -m "style(fretboard): add vertical fret-line layer and center string lines"
```

---

## Task 5: FretMarker — Circular Marker Redesign

**Files:**
- Modify: `src/components/fretboard/FretMarker.tsx`
- Modify: `src/components/fretboard/Fretboard.test.tsx`

**Interfaces:**
- No prop change to `FretMarker` — same `{ string, fret, selected, highlighted, noteLabel, onClick }` props, same `aria-label`/`aria-pressed`/`onClick` on the root `<button>`. Only the internal DOM structure changes (the button now wraps an inner circular `<span>` that carries the color/ring/glow classes instead of the button itself carrying them) — this requires updating the two existing glow tests that inspected the button's own `className`.

- [ ] **Step 1: Update the tests**

In `src/components/fretboard/Fretboard.test.tsx`, replace the two existing glow tests (`'applies a glow/ring style to a selected fret marker'` and `'applies a stronger glow to the currently highlighted marker during playback'`) with versions that inspect the marker's inner circle instead of the outer button, and add one new test confirming the marker is circular:

```tsx
  it('applies a glow/ring style to a selected fret marker', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/ring-2/);
    expect(circle?.className).toMatch(/shadow-/);
  });

  it('applies a stronger glow to the currently highlighted marker during playback', () => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [{ string: 6, fret: 1 }] });
    render(<Fretboard currentIndex={0} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/ring-amber-200/);
  });

  it('renders the fret marker as a circular button', () => {
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    const circle = cell.querySelector('span');
    expect(circle?.className).toMatch(/rounded-full/);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- Fretboard`
Expected: FAIL — the current `FretMarker` puts the color/ring classes on the button itself and has no inner `<span>`, so `cell.querySelector('span')` returns `null` and the assertions fail.

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
    ? 'bg-amber-300 text-zinc-900 ring-2 ring-amber-200/70 shadow-[0_0_10px_rgba(252,211,77,0.8)]'
    : selected
      ? 'bg-amber-400 text-zinc-900 ring-2 ring-amber-300/50 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
      : 'bg-transparent text-transparent';

  return (
    <button
      type="button"
      aria-label={`corda ${string}, casa ${fret}`}
      aria-pressed={selected}
      onClick={onClick}
      className="group flex h-12 w-14 items-center justify-center transition-all duration-200"
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium tracking-wide transition-all duration-200 group-hover:bg-zinc-100/10 ${circleClasses}`}
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
git commit -m "style(fretboard): redesign note markers as centered circles"
```

---

## Task 6: Audio — Regression Test for Strict Click Order

**Files:**
- Modify: `src/state/fretboard-store.test.ts`
- Modify: `src/hooks/useNotePlayback.test.tsx`

**Interfaces:**
- No production code change in this task — these are regression tests confirming existing behavior (no `.sort()` exists anywhere in the codebase; click order is already preserved end-to-end).

- [ ] **Step 1: Write the tests**

Add to `src/state/fretboard-store.test.ts` (new test in the existing `describe` block):

```ts
  it('keeps both positions selected when they produce the same note name at different frets/strings (F# on string 6 fret 2, and F# on string 1 fret 2)', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 2 }); // F#2
    store.toggleNote({ string: 1, fret: 2 }); // F#4
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 6, fret: 2 },
      { string: 1, fret: 2 },
    ]);
  });
```

Add to `src/hooks/useNotePlayback.test.tsx` — first add `getNoteAt` and `STANDARD_TUNING` to the imports at the top of the file:

```tsx
import { getNoteAt } from '../domain/music-theory/notes';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
```

Then add this new test in the existing `describe('useNotePlayback', ...)` block:

```tsx
  it('preserves the exact click order the user selected (F#, C, F#, G, C#, B), without sorting by string/fret and without deduping repeated note names', async () => {
    const clickOrder = [
      { string: 6, fret: 2 }, // F#2
      { string: 2, fret: 1 }, // C4
      { string: 1, fret: 2 }, // F#4 (same note name as the first, different position)
      { string: 1, fret: 3 }, // G4
      { string: 2, fret: 2 }, // C#4
      { string: 2, fret: 0 }, // B3
    ];
    useFretboardStore.setState({ selectedNotes: clickOrder });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    const [notes] = play.mock.calls[0];
    const expectedFrequencies = clickOrder.map((position) => getNoteAt(STANDARD_TUNING, position).frequency);
    expect(notes.map((note: { frequency: number }) => note.frequency)).toEqual(expectedFrequencies);
  });
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `npm run test -- fretboard-store useNotePlayback`
Expected: PASS — both tests should pass immediately against the current, unmodified code, confirming there is no ordering/deduplication bug today. (This is a regression-test-only task; if either test unexpectedly fails, stop and report it as a real bug found, rather than "fixing" the test to match broken behavior.)

Run: `npm run test`
Expected: PASS (full suite)

- [ ] **Step 3: Commit**

```bash
git add src/state/fretboard-store.test.ts src/hooks/useNotePlayback.test.tsx
git commit -m "test(audio): add regression coverage for strict click-order playback"
```

---

## Task 7: Audio — Reset currentIndex Before Starting Playback

**Files:**
- Modify: `src/hooks/useNotePlayback.ts`
- Modify: `src/hooks/useNotePlayback.test.tsx`

**Interfaces:**
- No change to `useNotePlayback`'s returned shape (`{ play, stop, isPlaying, currentIndex }`).

- [ ] **Step 1: Write the failing test**

Add to `src/hooks/useNotePlayback.test.tsx` (new test in the existing `describe` block):

```tsx
  it('resets currentIndex before starting a new sequence, clearing any stale highlight', async () => {
    usePlaybackStore.setState({ isPlaying: false, currentIndex: 3 });
    const { result } = renderHook(() => useNotePlayback());

    let indexDuringPlayCall: number | null = null;
    play.mockImplementationOnce(() => {
      indexDuringPlayCall = usePlaybackStore.getState().currentIndex;
    });

    await act(async () => {
      await result.current.play();
    });

    expect(indexDuringPlayCall).toBeNull();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test -- useNotePlayback`
Expected: FAIL — `play()` currently doesn't reset `currentIndex`, so it's still `3` at the moment `sequencePlayer.play` is called.

- [ ] **Step 3: Implement**

In `src/hooks/useNotePlayback.ts`, add `setCurrentIndex(null);` as the first line of `play()`'s body, and add `setCurrentIndex` to the callback's dependency array:

```ts
  const play = useCallback(async () => {
    setCurrentIndex(null);
    await ensureAudioStarted();
    const notes = selectedNotes.map((position) => getNoteAt(STANDARD_TUNING, position));
    sequencePlayer.play(notes, bpm, subdivision);
    setIsPlaying(true);
  }, [selectedNotes, bpm, subdivision, setIsPlaying, setCurrentIndex]);
```

Every other line in the file — `stop()`, the `onNoteChange` effect, the return statement — stays exactly as it is today.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test -- useNotePlayback`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotePlayback.ts src/hooks/useNotePlayback.test.tsx
git commit -m "fix(audio): reset currentIndex before starting a new playback sequence"
```

---

## Self-Review Notes

- **Spec coverage:** every item in the spec maps to a task — Astryx/Gothic install and theme wrap (Task 1), sidebar navigation replacing tabs (Tasks 2-3), circular fretboard markers with visible string/fret lines (Tasks 4-5), strict click-order regression coverage (Task 6), and the `currentIndex` reset fix (Task 7).
- **Type consistency verified:** `TabId`/`useUiStore`'s shape (unchanged from the prior refactor) is reused verbatim by `AppSidebar` (Task 2) and `App.tsx` (Task 3); `FretMarker`'s prop shape is unchanged across Tasks 4-5 despite its internal DOM restructuring, so `Fretboard.tsx` never needs to change how it calls `FretMarker`.
- **Verified against real library source, not just documentation prose:** the `Theme` provider's actual export name, the `gothicTheme`/`built` import path, `SideNav`/`SideNavItem`'s real prop signatures (including `icon` accepting a component), and the semantic icon list gap that necessitates `lucide-react` were all confirmed by reading `facebook/astryx`'s source files directly, not assumed from the marketing pages.
- **Out of scope confirmed absent from every task:** no changes to `src/audio/**`, `src/domain/**`, `fretboard-store.ts`, `metronome-store.ts`, `persistence.ts`, and no reactivation of the metronome button — matching the spec's Section 8.

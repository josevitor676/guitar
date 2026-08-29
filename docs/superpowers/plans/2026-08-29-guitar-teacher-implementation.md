# Guitar Teacher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal-use web app with an interactive horizontal 6-string guitar fretboard, real-sample audio playback, and a synchronized configurable metronome.

**Architecture:** Clean/modular separation into `domain` (pure music-theory TypeScript, no I/O), `audio` (Tone.js engine behind small interfaces), `state` (Zustand stores per concern, persisted to localStorage), `hooks` (glue between state+audio for components), and `components` (presentation only). Domain and audio are unit-tested in isolation; components are tested with React Testing Library against mocked hooks/audio.

**Tech Stack:** React + TypeScript + Vite, Tailwind CSS, Tone.js, Zustand, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-29-guitar-teacher-design.md`

## Global Constraints

- Guitar: 6 strings, standard tuning E2-A2-D3-G3-B3-E4. String numbering follows tradition: string 6 = low E, string 1 = high E.
- Fretboard renders horizontally: nut/left hand on the left, strings run horizontally, frets run vertically. String 6 (low E) is the topmost row, string 1 (high E) the bottom row.
- Initial visible fret range: frets 1-7, with a control to change the visible range.
- Selection model: every click on a fret cell toggles that position in an ordered sequence (append on select, remove on deselect); no chord/simultaneous-note support in v1. Playback strictly follows click order, which may jump freely between strings/frets.
- Rhythm is a single global setting (BPM + subdivision) applied to the whole sequence; no per-note duration in v1.
- Audio uses real guitar samples via `Tone.Sampler`, loaded from a public CDN URL (no local asset management). A basic synth (not a sample) is fine for the metronome click.
- Metronome runs independently of sequence playback and shares the same `Tone.Transport`, so the audible click, the visual pulse indicator, and the fretboard's "current note" highlight all stay in sync.
- Predefined exercises are hardcoded in TypeScript (`aquecimento`, `digitacao`, `escala`, `arpejo` categories) — no UI authoring in v1.
- Persisted to localStorage: BPM, subdivision, and visible fret range. Nothing else is required to persist.
- No backend, no auth, no multi-user support.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`
- Create: `src/main.tsx`, `src/index.css`
- Create: `vitest.config.ts` (or merge into `vite.config.ts`)
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: a working `npm run dev`, `npm run build`, `npm run test` pipeline that every later task relies on.

- [ ] **Step 1: Scaffold the Vite React-TS project**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the current directory not being empty (it contains `imagens/` and `docs/`), confirm to proceed in the current directory.

- [ ] **Step 2: Install runtime and dev dependencies**

```bash
npm install tone zustand
npm install -D tailwindcss postcss autoprefixer vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  jsdom
```

- [ ] **Step 3: Configure Tailwind**

```bash
npx tailwindcss init -p --ts
```

Edit `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

Replace the contents of `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Configure Vitest**

Edit `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 5: Create the domain/audio/state/hooks/components folder skeleton**

```bash
mkdir -p src/domain/music-theory src/domain/fretboard src/domain/exercises
mkdir -p src/audio src/state src/hooks
mkdir -p src/components/fretboard src/components/metronome src/components/player src/components/exercises src/components/layout
```

- [ ] **Step 6: Verify the pipeline works**

Run: `npm run test`
Expected: Vitest runs with 0 test files found, exits 0 (no failures).

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite+React+TS+Tailwind+Vitest project"
```

---

## Task 2: Domain — Tuning and Rhythm Primitives

**Files:**
- Create: `src/domain/music-theory/tuning.ts`
- Create: `src/domain/music-theory/rhythm.ts`
- Test: `src/domain/music-theory/tuning.test.ts`
- Test: `src/domain/music-theory/rhythm.test.ts`

**Interfaces:**
- Produces: `StringNumber` (`1|2|3|4|5|6`), `FretPosition { string: StringNumber; fret: number }`, `Tuning = Record<StringNumber, string>`, `STANDARD_TUNING: Tuning`, `Subdivision = 'quarter'|'eighth'|'triplet'|'sixteenth'`, `SUBDIVISION_DURATIONS: Record<Subdivision, string>`. Every later domain/audio/state task imports these.

- [ ] **Step 1: Write the failing tests**

`src/domain/music-theory/tuning.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STANDARD_TUNING } from './tuning';

describe('STANDARD_TUNING', () => {
  it('maps string 6 to low E2 and string 1 to high E4', () => {
    expect(STANDARD_TUNING[6]).toBe('E2');
    expect(STANDARD_TUNING[1]).toBe('E4');
  });

  it('defines all six strings in standard EADGBE tuning', () => {
    expect(STANDARD_TUNING).toEqual({
      6: 'E2',
      5: 'A2',
      4: 'D3',
      3: 'G3',
      2: 'B3',
      1: 'E4',
    });
  });
});
```

`src/domain/music-theory/rhythm.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SUBDIVISION_DURATIONS } from './rhythm';

describe('SUBDIVISION_DURATIONS', () => {
  it('maps every subdivision to a Tone.js notation string', () => {
    expect(SUBDIVISION_DURATIONS.quarter).toBe('4n');
    expect(SUBDIVISION_DURATIONS.eighth).toBe('8n');
    expect(SUBDIVISION_DURATIONS.triplet).toBe('8t');
    expect(SUBDIVISION_DURATIONS.sixteenth).toBe('16n');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tuning rhythm`
Expected: FAIL — `tuning.ts` and `rhythm.ts` do not exist yet.

- [ ] **Step 3: Implement**

`src/domain/music-theory/tuning.ts`:

```ts
export type StringNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface FretPosition {
  string: StringNumber;
  fret: number;
}

export type Tuning = Record<StringNumber, string>;

export const STANDARD_TUNING: Tuning = {
  6: 'E2',
  5: 'A2',
  4: 'D3',
  3: 'G3',
  2: 'B3',
  1: 'E4',
};
```

`src/domain/music-theory/rhythm.ts`:

```ts
export type Subdivision = 'quarter' | 'eighth' | 'triplet' | 'sixteenth';

export const SUBDIVISION_DURATIONS: Record<Subdivision, string> = {
  quarter: '4n',
  eighth: '8n',
  triplet: '8t',
  sixteenth: '16n',
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tuning rhythm`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/music-theory/tuning.ts src/domain/music-theory/rhythm.ts \
  src/domain/music-theory/tuning.test.ts src/domain/music-theory/rhythm.test.ts
git commit -m "feat(domain): add tuning and rhythm primitives"
```

---

## Task 3: Domain — Note Calculation

**Files:**
- Create: `src/domain/music-theory/notes.ts`
- Test: `src/domain/music-theory/notes.test.ts`

**Interfaces:**
- Consumes: `FretPosition`, `Tuning`, `STANDARD_TUNING` from `./tuning` (Task 2).
- Produces: `Note { pitchClass: string; octave: number; midi: number; frequency: number }`, `noteNameToMidi(name: string): number`, `midiToNoteName(midi: number): { pitchClass: string; octave: number }`, `midiToFrequency(midi: number): number`, `getNoteAt(tuning: Tuning, position: FretPosition): Note`. Used by `scales-arpeggios.ts`, `sampler.ts` (via hooks), and `sequence-player` consumers.

- [ ] **Step 1: Write the failing tests**

`src/domain/music-theory/notes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { noteNameToMidi, midiToNoteName, midiToFrequency, getNoteAt } from './notes';
import { STANDARD_TUNING } from './tuning';

describe('noteNameToMidi', () => {
  it('converts A4 to MIDI 69 (concert pitch reference)', () => {
    expect(noteNameToMidi('A4')).toBe(69);
  });

  it('converts C4 to MIDI 60 (middle C)', () => {
    expect(noteNameToMidi('C4')).toBe(60);
  });

  it('converts E2 to MIDI 40', () => {
    expect(noteNameToMidi('E2')).toBe(40);
  });
});

describe('midiToNoteName', () => {
  it('converts MIDI 69 back to A4', () => {
    expect(midiToNoteName(69)).toEqual({ pitchClass: 'A', octave: 4 });
  });

  it('converts MIDI 61 to C#4', () => {
    expect(midiToNoteName(61)).toEqual({ pitchClass: 'C#', octave: 4 });
  });
});

describe('midiToFrequency', () => {
  it('converts MIDI 69 (A4) to 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 2);
  });

  it('converts MIDI 60 (C4) to ~261.63 Hz', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1);
  });
});

describe('getNoteAt', () => {
  it('returns the open string note for fret 0 on string 6', () => {
    const note = getNoteAt(STANDARD_TUNING, { string: 6, fret: 0 });
    expect(note.pitchClass).toBe('E');
    expect(note.octave).toBe(2);
  });

  it('returns E on the 5th fret of string 6 (matches open string 5, A2)', () => {
    const note = getNoteAt(STANDARD_TUNING, { string: 6, fret: 5 });
    expect(note.pitchClass).toBe('A');
    expect(note.octave).toBe(2);
  });

  it('computes the correct frequency for string 1 open (E4)', () => {
    const note = getNoteAt(STANDARD_TUNING, { string: 1, fret: 0 });
    expect(note.frequency).toBeCloseTo(329.63, 1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- notes`
Expected: FAIL — `notes.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/domain/music-theory/notes.ts`:

```ts
import type { FretPosition, Tuning } from './tuning';

const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export interface Note {
  pitchClass: string;
  octave: number;
  midi: number;
  frequency: number;
}

export function noteNameToMidi(name: string): number {
  const match = /^([A-G]#?)(-?\d+)$/.exec(name);
  if (!match) {
    throw new Error(`Invalid note name: ${name}`);
  }
  const [, pitchClass, octaveStr] = match;
  const octave = Number(octaveStr);
  const semitone = PITCH_CLASSES.indexOf(pitchClass);
  return (octave + 1) * 12 + semitone;
}

export function midiToNoteName(midi: number): { pitchClass: string; octave: number } {
  const semitone = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return { pitchClass: PITCH_CLASSES[semitone], octave };
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function getNoteAt(tuning: Tuning, position: FretPosition): Note {
  const openMidi = noteNameToMidi(tuning[position.string]);
  const midi = openMidi + position.fret;
  const { pitchClass, octave } = midiToNoteName(midi);
  return { pitchClass, octave, midi, frequency: midiToFrequency(midi) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- notes`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/music-theory/notes.ts src/domain/music-theory/notes.test.ts
git commit -m "feat(domain): add note/frequency calculation from fret positions"
```

---

## Task 4: Domain — Intervals and Degrees

**Files:**
- Create: `src/domain/music-theory/intervals.ts`
- Test: `src/domain/music-theory/intervals.test.ts`

**Interfaces:**
- Consumes: nothing beyond plain numbers/strings.
- Produces: `getIntervalSemitones(rootMidi: number, noteMidi: number): number` (0-11), `getIntervalDegreeLabel(semitones: number): string`. Used later by `FretMarker` (optional degree display) and available for `scales-arpeggios.ts` if needed.

- [ ] **Step 1: Write the failing tests**

`src/domain/music-theory/intervals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getIntervalSemitones, getIntervalDegreeLabel } from './intervals';

describe('getIntervalSemitones', () => {
  it('returns 0 for the same note an octave apart', () => {
    expect(getIntervalSemitones(60, 72)).toBe(0);
  });

  it('returns 7 for a perfect fifth', () => {
    expect(getIntervalSemitones(60, 67)).toBe(7);
  });

  it('wraps negative differences into 0-11', () => {
    expect(getIntervalSemitones(67, 60)).toBe(5);
  });
});

describe('getIntervalDegreeLabel', () => {
  it('labels 0 semitones as the root (1)', () => {
    expect(getIntervalDegreeLabel(0)).toBe('1');
  });

  it('labels 4 semitones as a major third (3)', () => {
    expect(getIntervalDegreeLabel(4)).toBe('3');
  });

  it('labels 3 semitones as a minor third (b3)', () => {
    expect(getIntervalDegreeLabel(3)).toBe('b3');
  });

  it('labels 7 semitones as a perfect fifth (5)', () => {
    expect(getIntervalDegreeLabel(7)).toBe('5');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- intervals`
Expected: FAIL — `intervals.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/domain/music-theory/intervals.ts`:

```ts
const DEGREE_LABELS = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

export function getIntervalSemitones(rootMidi: number, noteMidi: number): number {
  return ((noteMidi - rootMidi) % 12 + 12) % 12;
}

export function getIntervalDegreeLabel(semitones: number): string {
  return DEGREE_LABELS[((semitones % 12) + 12) % 12];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- intervals`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/music-theory/intervals.ts src/domain/music-theory/intervals.test.ts
git commit -m "feat(domain): add interval/degree calculation"
```

---

## Task 5: Domain — Scale and Arpeggio Patterns

**Files:**
- Create: `src/domain/music-theory/scales-arpeggios.ts`
- Test: `src/domain/music-theory/scales-arpeggios.test.ts`

**Interfaces:**
- Consumes: `FretPosition`, `Tuning` from `./tuning`; `getNoteAt` from `./notes` (Task 3).
- Produces: `SCALE_PATTERNS: Record<string, number[]>`, `ARPEGGIO_PATTERNS: Record<string, number[]>`, `generatePositionsForPattern(tuning: Tuning, rootPitchClass: string, intervals: number[], fretRange: { minFret: number; maxFret: number }): FretPosition[]`. Used by Task 7 (`exercise-catalog.ts`).

- [ ] **Step 1: Write the failing tests**

`src/domain/music-theory/scales-arpeggios.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SCALE_PATTERNS, ARPEGGIO_PATTERNS, generatePositionsForPattern } from './scales-arpeggios';
import { STANDARD_TUNING } from './tuning';
import { getNoteAt } from './notes';

describe('SCALE_PATTERNS', () => {
  it('defines the major scale as whole/half step intervals from the root', () => {
    expect(SCALE_PATTERNS.major).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });
});

describe('ARPEGGIO_PATTERNS', () => {
  it('defines the major triad as root, third, fifth', () => {
    expect(ARPEGGIO_PATTERNS.majorTriad).toEqual([0, 4, 7]);
  });
});

describe('generatePositionsForPattern', () => {
  it('only returns positions within the given fret range', () => {
    const positions = generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 0,
      maxFret: 3,
    });
    expect(positions.every((p) => p.fret >= 0 && p.fret <= 3)).toBe(true);
    expect(positions.length).toBeGreaterThan(0);
  });

  it('every returned position actually belongs to the C major scale', () => {
    const positions = generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 0,
      maxFret: 3,
    });
    const majorPitchClasses = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    for (const position of positions) {
      const note = getNoteAt(STANDARD_TUNING, position);
      expect(majorPitchClasses).toContain(note.pitchClass);
    }
  });

  it('includes the open low-E string when it matches the pattern', () => {
    const positions = generatePositionsForPattern(STANDARD_TUNING, 'E', SCALE_PATTERNS.major, {
      minFret: 0,
      maxFret: 0,
    });
    expect(positions).toContainEqual({ string: 6, fret: 0 });
    expect(positions).toContainEqual({ string: 1, fret: 0 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- scales-arpeggios`
Expected: FAIL — `scales-arpeggios.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/domain/music-theory/scales-arpeggios.ts`:

```ts
import type { FretPosition, Tuning, StringNumber } from './tuning';
import { getNoteAt, noteNameToMidi } from './notes';

export const SCALE_PATTERNS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  naturalMinor: [0, 2, 3, 5, 7, 8, 10],
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
};

export const ARPEGGIO_PATTERNS: Record<string, number[]> = {
  majorTriad: [0, 4, 7],
  minorTriad: [0, 3, 7],
  dominant7: [0, 4, 7, 10],
};

const ALL_STRINGS: StringNumber[] = [6, 5, 4, 3, 2, 1];

export function generatePositionsForPattern(
  tuning: Tuning,
  rootPitchClass: string,
  intervals: number[],
  fretRange: { minFret: number; maxFret: number },
): FretPosition[] {
  const rootSemitone = noteNameToMidi(`${rootPitchClass}0`) % 12;
  const allowedSemitones = new Set(intervals.map((interval) => (rootSemitone + interval) % 12));

  const positions: FretPosition[] = [];
  for (const string of ALL_STRINGS) {
    for (let fret = fretRange.minFret; fret <= fretRange.maxFret; fret += 1) {
      const position = { string, fret };
      const note = getNoteAt(tuning, position);
      const noteSemitone = note.midi % 12;
      if (allowedSemitones.has(noteSemitone)) {
        positions.push(position);
      }
    }
  }
  return positions;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- scales-arpeggios`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/music-theory/scales-arpeggios.ts src/domain/music-theory/scales-arpeggios.test.ts
git commit -m "feat(domain): add scale/arpeggio pattern generation"
```

---

## Task 6: Domain — Fretboard Position Validation

**Files:**
- Create: `src/domain/fretboard/fretboard-model.ts`
- Test: `src/domain/fretboard/fretboard-model.test.ts`

**Interfaces:**
- Consumes: `FretPosition` from `../music-theory/tuning`.
- Produces: `isValidPosition(position: FretPosition, fretRange: { minFret: number; maxFret: number }): boolean`, `positionsEqual(a: FretPosition, b: FretPosition): boolean`. Used by Task 12 (`fretboard-store.ts`) and Task 7's catalog sanity checks.

- [ ] **Step 1: Write the failing tests**

`src/domain/fretboard/fretboard-model.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isValidPosition, positionsEqual } from './fretboard-model';

describe('isValidPosition', () => {
  it('accepts a position within string 1-6 and the given fret range', () => {
    expect(isValidPosition({ string: 6, fret: 3 }, { minFret: 0, maxFret: 24 })).toBe(true);
  });

  it('rejects a string number outside 1-6', () => {
    // @ts-expect-error testing runtime guard against invalid input
    expect(isValidPosition({ string: 7, fret: 3 }, { minFret: 0, maxFret: 24 })).toBe(false);
  });

  it('rejects a negative fret', () => {
    expect(isValidPosition({ string: 6, fret: -1 }, { minFret: 0, maxFret: 24 })).toBe(false);
  });

  it('rejects a fret above the configured maximum', () => {
    expect(isValidPosition({ string: 6, fret: 25 }, { minFret: 0, maxFret: 24 })).toBe(false);
  });
});

describe('positionsEqual', () => {
  it('returns true for identical string/fret pairs', () => {
    expect(positionsEqual({ string: 3, fret: 5 }, { string: 3, fret: 5 })).toBe(true);
  });

  it('returns false when string differs', () => {
    expect(positionsEqual({ string: 3, fret: 5 }, { string: 4, fret: 5 })).toBe(false);
  });

  it('returns false when fret differs', () => {
    expect(positionsEqual({ string: 3, fret: 5 }, { string: 3, fret: 6 })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- fretboard-model`
Expected: FAIL — `fretboard-model.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/domain/fretboard/fretboard-model.ts`:

```ts
import type { FretPosition } from '../music-theory/tuning';

export function isValidPosition(
  position: FretPosition,
  fretRange: { minFret: number; maxFret: number },
): boolean {
  const validString = position.string >= 1 && position.string <= 6;
  const validFret = position.fret >= fretRange.minFret && position.fret <= fretRange.maxFret;
  return validString && validFret;
}

export function positionsEqual(a: FretPosition, b: FretPosition): boolean {
  return a.string === b.string && a.fret === b.fret;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- fretboard-model`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/fretboard/fretboard-model.ts src/domain/fretboard/fretboard-model.test.ts
git commit -m "feat(domain): add fretboard position validation helpers"
```

---

## Task 7: Domain — Exercise Types and Catalog

**Files:**
- Create: `src/domain/exercises/exercise.types.ts`
- Create: `src/domain/exercises/exercise-catalog.ts`
- Test: `src/domain/exercises/exercise-catalog.test.ts`

**Interfaces:**
- Consumes: `FretPosition`, `STANDARD_TUNING` from `../music-theory/tuning`; `generatePositionsForPattern`, `SCALE_PATTERNS`, `ARPEGGIO_PATTERNS` from `../music-theory/scales-arpeggios` (Task 5); `isValidPosition` from `../fretboard/fretboard-model` (Task 6).
- Produces: `ExerciseCategory = 'aquecimento' | 'digitacao' | 'escala' | 'arpejo'`, `Exercise { id: string; name: string; category: ExerciseCategory; positions: FretPosition[] }`, `EXERCISE_CATALOG: Exercise[]`. Used by Task 14 (`exercise-store.ts`) and Task 20 (`ExerciseList.tsx`).

- [ ] **Step 1: Write the failing test**

`src/domain/exercises/exercise-catalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { EXERCISE_CATALOG } from './exercise-catalog';
import { isValidPosition } from '../fretboard/fretboard-model';

describe('EXERCISE_CATALOG', () => {
  it('has at least one exercise per required category', () => {
    const categories = new Set(EXERCISE_CATALOG.map((exercise) => exercise.category));
    expect(categories).toEqual(new Set(['aquecimento', 'digitacao', 'escala', 'arpejo']));
  });

  it('has unique ids', () => {
    const ids = EXERCISE_CATALOG.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has only valid fret positions (frets 0-24, strings 1-6)', () => {
    for (const exercise of EXERCISE_CATALOG) {
      for (const position of exercise.positions) {
        expect(isValidPosition(position, { minFret: 0, maxFret: 24 })).toBe(true);
      }
    }
  });

  it('has a non-empty positions sequence for every exercise', () => {
    for (const exercise of EXERCISE_CATALOG) {
      expect(exercise.positions.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- exercise-catalog`
Expected: FAIL — `exercise-catalog.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/domain/exercises/exercise.types.ts`:

```ts
import type { FretPosition } from '../music-theory/tuning';

export type ExerciseCategory = 'aquecimento' | 'digitacao' | 'escala' | 'arpejo';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  positions: FretPosition[];
}
```

`src/domain/exercises/exercise-catalog.ts`:

```ts
import type { Exercise } from './exercise.types';
import { STANDARD_TUNING } from '../music-theory/tuning';
import { SCALE_PATTERNS, ARPEGGIO_PATTERNS, generatePositionsForPattern } from '../music-theory/scales-arpeggios';

export const EXERCISE_CATALOG: Exercise[] = [
  {
    id: 'warmup-1234-low-e',
    name: 'Aquecimento 1-2-3-4 (corda 6)',
    category: 'aquecimento',
    positions: [
      { string: 6, fret: 1 },
      { string: 6, fret: 2 },
      { string: 6, fret: 3 },
      { string: 6, fret: 4 },
    ],
  },
  {
    id: 'fingering-diagonal-6-4',
    name: 'Digitação diagonal (corda 6 à 4)',
    category: 'digitacao',
    positions: [
      { string: 6, fret: 1 },
      { string: 5, fret: 2 },
      { string: 4, fret: 3 },
    ],
  },
  {
    id: 'scale-c-major-open-position',
    name: 'Escala Maior de Dó (posição aberta)',
    category: 'escala',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', SCALE_PATTERNS.major, {
      minFret: 0,
      maxFret: 3,
    }),
  },
  {
    id: 'arpeggio-c-major-open-position',
    name: 'Arpejo Maior de Dó (posição aberta)',
    category: 'arpejo',
    positions: generatePositionsForPattern(STANDARD_TUNING, 'C', ARPEGGIO_PATTERNS.majorTriad, {
      minFret: 0,
      maxFret: 3,
    }),
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- exercise-catalog`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/exercises/exercise.types.ts src/domain/exercises/exercise-catalog.ts \
  src/domain/exercises/exercise-catalog.test.ts
git commit -m "feat(domain): add exercise types and initial hardcoded catalog"
```

---

## Task 8: Audio — Note Sampler

**Files:**
- Create: `src/audio/audio-engine.types.ts`
- Create: `src/audio/sampler.ts`
- Test: `src/audio/sampler.test.ts`

**Interfaces:**
- Consumes: `Tone` (mocked in tests).
- Produces: `INoteSampler { isLoaded(): boolean; playNote(frequencyHz: number, duration: number | string): void }`, `ToneNoteSampler implements INoteSampler`. `duration` accepts either seconds (a plain number, used for immediate click-to-preview playback) or Tone.js notation (e.g. `'4n'`, used when playing a scheduled sequence note) — both are valid `Tone.Unit.Time` values that `Tone.Sampler.triggerAttackRelease` accepts natively. Used by Task 10 (`sequence-player.ts`) and Task 11 (singleton wiring).

- [ ] **Step 1: Write the failing test**

`src/audio/sampler.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const triggerAttackRelease = vi.fn();
let capturedOnload: (() => void) | undefined;

vi.mock('tone', () => {
  return {
    Sampler: vi.fn().mockImplementation((options: { onload?: () => void }) => {
      capturedOnload = options.onload;
      return {
        toDestination: vi.fn().mockReturnThis(),
        triggerAttackRelease,
      };
    }),
  };
});

import { ToneNoteSampler } from './sampler';

describe('ToneNoteSampler', () => {
  beforeEach(() => {
    triggerAttackRelease.mockClear();
    capturedOnload = undefined;
  });

  it('is not loaded until the underlying Tone.Sampler fires onload', () => {
    const sampler = new ToneNoteSampler();
    expect(sampler.isLoaded()).toBe(false);
  });

  it('becomes loaded once the sample onload callback fires', () => {
    const sampler = new ToneNoteSampler();
    capturedOnload?.();
    expect(sampler.isLoaded()).toBe(true);
  });

  it('does not play a note before samples are loaded', () => {
    const sampler = new ToneNoteSampler();
    sampler.playNote(440, 0.5);
    expect(triggerAttackRelease).not.toHaveBeenCalled();
  });

  it('triggers the underlying sampler once loaded', () => {
    const sampler = new ToneNoteSampler();
    capturedOnload?.();
    sampler.playNote(440, 0.5);
    expect(triggerAttackRelease).toHaveBeenCalledWith(440, 0.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- sampler`
Expected: FAIL — `sampler.ts` and `audio-engine.types.ts` do not exist yet.

- [ ] **Step 3: Implement**

`src/audio/audio-engine.types.ts`:

```ts
import type { Subdivision } from '../domain/music-theory/rhythm';

export interface INoteSampler {
  isLoaded(): boolean;
  playNote(frequencyHz: number, duration: number | string): void;
}

export interface IMetronome {
  start(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setSubdivision(subdivision: Subdivision): void;
  onPulse(callback: (pulseIndex: number) => void): () => void;
}

export interface ISequencePlayer {
  play(notes: { frequency: number }[], bpm: number, subdivision: Subdivision): void;
  stop(): void;
  onNoteChange(callback: (index: number) => void): () => void;
}
```

`src/audio/sampler.ts`:

```ts
import * as Tone from 'tone';
import type { INoteSampler } from './audio-engine.types';

const BASE_URL = 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/';

const SAMPLE_URLS: Record<string, string> = {
  E2: 'E2.mp3',
  A2: 'A2.mp3',
  D3: 'D3.mp3',
  G3: 'G3.mp3',
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
};

export class ToneNoteSampler implements INoteSampler {
  private sampler: Tone.Sampler;
  private loaded = false;

  constructor() {
    this.sampler = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: BASE_URL,
      onload: () => {
        this.loaded = true;
      },
    }).toDestination();
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  playNote(frequencyHz: number, duration: number | string): void {
    if (!this.loaded) return;
    this.sampler.triggerAttackRelease(frequencyHz, duration);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- sampler`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/audio/audio-engine.types.ts src/audio/sampler.ts src/audio/sampler.test.ts
git commit -m "feat(audio): add Tone.Sampler-backed note sampler"
```

---

## Task 9: Audio — Metronome

**Files:**
- Create: `src/audio/metronome.ts`
- Test: `src/audio/metronome.test.ts`

**Interfaces:**
- Consumes: `IMetronome` from `./audio-engine.types` (Task 8); `Subdivision`, `SUBDIVISION_DURATIONS` from `../domain/music-theory/rhythm` (Task 2); `Tone` (mocked).
- Produces: `ToneMetronome implements IMetronome`. Used by Task 11 (singleton wiring) and Task 16 (`useMetronome` hook).

- [ ] **Step 1: Write the failing test**

`src/audio/metronome.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const triggerAttackRelease = vi.fn();
const loopStart = vi.fn();
const loopStop = vi.fn();
const loopDispose = vi.fn();
const transportStart = vi.fn();
const transportStop = vi.fn();

let capturedLoopCallback: ((time: number) => void) | undefined;
let capturedLoopInterval: string | undefined;
let lastLoopInstance: { interval: string } | undefined;

vi.mock('tone', () => {
  return {
    MembraneSynth: vi.fn().mockImplementation(() => ({
      toDestination: vi.fn().mockReturnThis(),
      triggerAttackRelease,
    })),
    Loop: vi.fn().mockImplementation((callback: (time: number) => void, interval: string) => {
      capturedLoopCallback = callback;
      capturedLoopInterval = interval;
      lastLoopInstance = { interval };
      return {
        start: loopStart.mockReturnValue({ stop: loopStop, dispose: loopDispose }),
        stop: loopStop,
        dispose: loopDispose,
        get interval() {
          return lastLoopInstance!.interval;
        },
        set interval(value: string) {
          lastLoopInstance!.interval = value;
        },
      };
    }),
    Transport: {
      start: transportStart,
      stop: transportStop,
      bpm: { value: 120 },
    },
  };
});

import { ToneMetronome } from './metronome';
import * as Tone from 'tone';

describe('ToneMetronome', () => {
  beforeEach(() => {
    triggerAttackRelease.mockClear();
    transportStart.mockClear();
    transportStop.mockClear();
    capturedLoopCallback = undefined;
    capturedLoopInterval = undefined;
  });

  it('starts the Tone.Transport and schedules a quarter-note loop by default', () => {
    const metronome = new ToneMetronome();
    metronome.start();
    expect(transportStart).toHaveBeenCalled();
    expect(capturedLoopInterval).toBe('4n');
  });

  it('sets Tone.Transport.bpm.value when setBpm is called', () => {
    const metronome = new ToneMetronome();
    metronome.setBpm(90);
    expect(Tone.Transport.bpm.value).toBe(90);
  });

  it('notifies pulse listeners each time the loop fires', () => {
    const metronome = new ToneMetronome();
    const onPulse = vi.fn();
    metronome.onPulse(onPulse);
    metronome.start();
    capturedLoopCallback?.(0);
    capturedLoopCallback?.(0.5);
    expect(onPulse).toHaveBeenNthCalledWith(1, 0);
    expect(onPulse).toHaveBeenNthCalledWith(2, 1);
  });

  it('stops notifying after unsubscribe', () => {
    const metronome = new ToneMetronome();
    const onPulse = vi.fn();
    const unsubscribe = metronome.onPulse(onPulse);
    metronome.start();
    unsubscribe();
    capturedLoopCallback?.(0);
    expect(onPulse).not.toHaveBeenCalled();
  });

  it('stops the transport on stop()', () => {
    const metronome = new ToneMetronome();
    metronome.start();
    metronome.stop();
    expect(transportStop).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- metronome`
Expected: FAIL — `metronome.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/audio/metronome.ts`:

```ts
import * as Tone from 'tone';
import type { IMetronome } from './audio-engine.types';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

export class ToneMetronome implements IMetronome {
  private click: Tone.MembraneSynth;
  private loop: Tone.Loop | null = null;
  private subdivision: Subdivision = 'quarter';
  private pulseIndex = 0;
  private listeners = new Set<(pulseIndex: number) => void>();

  constructor() {
    this.click = new Tone.MembraneSynth().toDestination();
  }

  start(): void {
    this.loop?.dispose();
    this.pulseIndex = 0;
    this.loop = new Tone.Loop((time) => {
      this.click.triggerAttackRelease('C2', '16n', time);
      this.listeners.forEach((listener) => listener(this.pulseIndex));
      this.pulseIndex += 1;
    }, SUBDIVISION_DURATIONS[this.subdivision]).start(0);
    Tone.Transport.start();
  }

  stop(): void {
    this.loop?.stop();
    Tone.Transport.stop();
  }

  setBpm(bpm: number): void {
    Tone.Transport.bpm.value = bpm;
  }

  setSubdivision(subdivision: Subdivision): void {
    this.subdivision = subdivision;
    if (this.loop) {
      this.loop.interval = SUBDIVISION_DURATIONS[subdivision];
    }
  }

  onPulse(callback: (pulseIndex: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- metronome`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/audio/metronome.ts src/audio/metronome.test.ts
git commit -m "feat(audio): add Tone.Transport-based metronome"
```

---

## Task 10: Audio — Sequence Player

**Files:**
- Create: `src/audio/sequence-player.ts`
- Test: `src/audio/sequence-player.test.ts`

**Interfaces:**
- Consumes: `ISequencePlayer`, `INoteSampler` from `./audio-engine.types` (Task 8); `Subdivision`, `SUBDIVISION_DURATIONS` from `../domain/music-theory/rhythm` (Task 2); `Tone` (mocked).
- Produces: `ToneSequencePlayer implements ISequencePlayer` (constructor takes `INoteSampler`). Used by Task 11 (singleton wiring) and Task 16 (`useNotePlayback` hook).

- [ ] **Step 1: Write the failing test**

`src/audio/sequence-player.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INoteSampler } from './audio-engine.types';

const sequenceStart = vi.fn();
const sequenceDispose = vi.fn();
const transportStart = vi.fn();

let capturedCallback: ((time: number, index: number) => void) | undefined;
let capturedEvents: number[] | undefined;
let capturedInterval: string | undefined;

vi.mock('tone', () => {
  return {
    Sequence: vi.fn().mockImplementation(
      (callback: (time: number, index: number) => void, events: number[], interval: string) => {
        capturedCallback = callback;
        capturedEvents = events;
        capturedInterval = interval;
        return {
          start: sequenceStart.mockReturnValue({ dispose: sequenceDispose }),
          dispose: sequenceDispose,
        };
      },
    ),
    Transport: {
      start: transportStart,
      bpm: { value: 120 },
    },
  };
});

import { ToneSequencePlayer } from './sequence-player';
import * as Tone from 'tone';

function createFakeSampler(): INoteSampler {
  return {
    isLoaded: () => true,
    playNote: vi.fn(),
  };
}

describe('ToneSequencePlayer', () => {
  beforeEach(() => {
    sequenceStart.mockClear();
    sequenceDispose.mockClear();
    transportStart.mockClear();
    capturedCallback = undefined;
  });

  it('sets the transport BPM and schedules one event per note', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play([{ frequency: 220 }, { frequency: 440 }], 100, 'eighth');

    expect(Tone.Transport.bpm.value).toBe(100);
    expect(capturedEvents).toEqual([0, 1]);
    expect(capturedInterval).toBe('8n');
    expect(transportStart).toHaveBeenCalled();
  });

  it('plays the correct note frequency when the sequence callback fires', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play([{ frequency: 220 }, { frequency: 440 }], 100, 'quarter');

    capturedCallback?.(0, 1);
    expect(sampler.playNote).toHaveBeenCalledWith(440, '4n');
  });

  it('notifies note-change listeners with the current index', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    const onNoteChange = vi.fn();
    player.onNoteChange(onNoteChange);
    player.play([{ frequency: 220 }], 100, 'quarter');

    capturedCallback?.(0, 0);
    expect(onNoteChange).toHaveBeenCalledWith(0);
  });

  it('disposes the previous sequence when stop is called', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play([{ frequency: 220 }], 100, 'quarter');
    player.stop();
    expect(sequenceDispose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- sequence-player`
Expected: FAIL — `sequence-player.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/audio/sequence-player.ts`:

```ts
import * as Tone from 'tone';
import type { ISequencePlayer, INoteSampler } from './audio-engine.types';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

export class ToneSequencePlayer implements ISequencePlayer {
  private sequence: Tone.Sequence | null = null;
  private listeners = new Set<(index: number) => void>();
  private readonly sampler: INoteSampler;

  constructor(sampler: INoteSampler) {
    this.sampler = sampler;
  }

  play(notes: { frequency: number }[], bpm: number, subdivision: Subdivision): void {
    this.stop();
    Tone.Transport.bpm.value = bpm;
    const duration = SUBDIVISION_DURATIONS[subdivision];
    this.sequence = new Tone.Sequence(
      (_time, index: number) => {
        const note = notes[index];
        this.sampler.playNote(note.frequency, duration);
        this.listeners.forEach((listener) => listener(index));
      },
      notes.map((_, index) => index),
      duration,
    ).start(0);
    Tone.Transport.start();
  }

  stop(): void {
    this.sequence?.dispose();
    this.sequence = null;
  }

  onNoteChange(callback: (index: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- sequence-player`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/audio/sequence-player.ts src/audio/sequence-player.test.ts
git commit -m "feat(audio): add Tone.Sequence-based sequence player"
```

---

## Task 11: Audio — Context Bootstrap and Singletons

**Files:**
- Create: `src/audio/audio-context.ts`
- Create: `src/audio/index.ts`
- Test: `src/audio/audio-context.test.ts`

**Interfaces:**
- Consumes: `Tone` (mocked); `ToneNoteSampler` (Task 8), `ToneMetronome` (Task 9), `ToneSequencePlayer` (Task 10).
- Produces: `ensureAudioStarted(): Promise<void>`; and from `src/audio/index.ts`: `sampler: INoteSampler`, `metronome: IMetronome`, `sequencePlayer: ISequencePlayer`, `ensureAudioStarted`. Used by every hook in Task 16.

- [ ] **Step 1: Write the failing test**

`src/audio/audio-context.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const start = vi.fn().mockResolvedValue(undefined);

vi.mock('tone', () => ({
  start,
}));

import { ensureAudioStarted } from './audio-context';

describe('ensureAudioStarted', () => {
  beforeEach(() => {
    start.mockClear();
  });

  it('calls Tone.start() the first time it is invoked', async () => {
    await ensureAudioStarted();
    expect(start).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- audio-context`
Expected: FAIL — `audio-context.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/audio/audio-context.ts`:

```ts
import * as Tone from 'tone';

let started = false;

export async function ensureAudioStarted(): Promise<void> {
  if (started) return;
  await Tone.start();
  started = true;
}
```

`src/audio/index.ts`:

```ts
import type { INoteSampler, IMetronome, ISequencePlayer } from './audio-engine.types';
import { ToneNoteSampler } from './sampler';
import { ToneMetronome } from './metronome';
import { ToneSequencePlayer } from './sequence-player';

export { ensureAudioStarted } from './audio-context';
export type { INoteSampler, IMetronome, ISequencePlayer } from './audio-engine.types';

export const sampler: INoteSampler = new ToneNoteSampler();
export const metronome: IMetronome = new ToneMetronome();
export const sequencePlayer: ISequencePlayer = new ToneSequencePlayer(sampler);
```

**Note for the implementer:** this test's mock note that `ensureAudioStarted` caches `started` at module scope, so calling it twice in the same test file only invokes `Tone.start()` once. This is intentional per the spec (Web Audio requires exactly one user-gesture-triggered start).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- audio-context`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/audio/audio-context.ts src/audio/index.ts src/audio/audio-context.test.ts
git commit -m "feat(audio): add audio context bootstrap and singleton wiring"
```

---

## Task 12: State — Fretboard Store

**Files:**
- Create: `src/state/fretboard-store.ts`
- Test: `src/state/fretboard-store.test.ts`

**Interfaces:**
- Consumes: `FretPosition` from `../domain/music-theory/tuning`; `positionsEqual` from `../domain/fretboard/fretboard-model` (Task 6); `zustand`.
- Produces: `useFretboardStore` (Zustand hook) exposing `{ minFret: number; maxFret: number; selectedNotes: FretPosition[]; setFretRange(minFret: number, maxFret: number): void; toggleNote(position: FretPosition): void; clearSelection(): void; loadSequence(positions: FretPosition[]): void }`. Used by Task 14 (`exercise-store.ts`), Task 15 (`persistence.ts`), and Task 16 (`useFretboardSelection` hook).

- [ ] **Step 1: Write the failing test**

`src/state/fretboard-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useFretboardStore } from './fretboard-store';

describe('useFretboardStore', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
  });

  it('starts with the default 1-7 fret range and no selected notes', () => {
    const state = useFretboardStore.getState();
    expect(state.minFret).toBe(1);
    expect(state.maxFret).toBe(7);
    expect(state.selectedNotes).toEqual([]);
  });

  it('appends a position to selectedNotes on first toggle', () => {
    useFretboardStore.getState().toggleNote({ string: 6, fret: 1 });
    expect(useFretboardStore.getState().selectedNotes).toEqual([{ string: 6, fret: 1 }]);
  });

  it('removes a position on second toggle of the same spot', () => {
    useFretboardStore.getState().toggleNote({ string: 6, fret: 1 });
    useFretboardStore.getState().toggleNote({ string: 6, fret: 1 });
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  it('preserves click order across non-adjacent strings/frets', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 1 });
    store.toggleNote({ string: 5, fret: 2 });
    store.toggleNote({ string: 4, fret: 3 });
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 6, fret: 1 },
      { string: 5, fret: 2 },
      { string: 4, fret: 3 },
    ]);
  });

  it('updates the visible fret range via setFretRange', () => {
    useFretboardStore.getState().setFretRange(5, 12);
    expect(useFretboardStore.getState().minFret).toBe(5);
    expect(useFretboardStore.getState().maxFret).toBe(12);
  });

  it('clears all selected notes via clearSelection', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 1 });
    store.clearSelection();
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  it('replaces the sequence wholesale via loadSequence', () => {
    const store = useFretboardStore.getState();
    store.toggleNote({ string: 6, fret: 1 });
    store.loadSequence([
      { string: 1, fret: 0 },
      { string: 2, fret: 1 },
    ]);
    expect(useFretboardStore.getState().selectedNotes).toEqual([
      { string: 1, fret: 0 },
      { string: 2, fret: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- fretboard-store`
Expected: FAIL — `fretboard-store.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/state/fretboard-store.ts`:

```ts
import { create } from 'zustand';
import type { FretPosition } from '../domain/music-theory/tuning';
import { positionsEqual } from '../domain/fretboard/fretboard-model';

interface FretboardState {
  minFret: number;
  maxFret: number;
  selectedNotes: FretPosition[];
  setFretRange: (minFret: number, maxFret: number) => void;
  toggleNote: (position: FretPosition) => void;
  clearSelection: () => void;
  loadSequence: (positions: FretPosition[]) => void;
}

export const useFretboardStore = create<FretboardState>((set) => ({
  minFret: 1,
  maxFret: 7,
  selectedNotes: [],
  setFretRange: (minFret, maxFret) => set({ minFret, maxFret }),
  toggleNote: (position) =>
    set((state) => {
      const exists = state.selectedNotes.some((note) => positionsEqual(note, position));
      return {
        selectedNotes: exists
          ? state.selectedNotes.filter((note) => !positionsEqual(note, position))
          : [...state.selectedNotes, position],
      };
    }),
  clearSelection: () => set({ selectedNotes: [] }),
  loadSequence: (positions) => set({ selectedNotes: positions }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- fretboard-store`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/fretboard-store.ts src/state/fretboard-store.test.ts
git commit -m "feat(state): add fretboard selection store"
```

---

## Task 13: State — Metronome Store

**Files:**
- Create: `src/state/metronome-store.ts`
- Test: `src/state/metronome-store.test.ts`

**Interfaces:**
- Consumes: `Subdivision` from `../domain/music-theory/rhythm` (Task 2); `zustand`.
- Produces: `useMetronomeStore` exposing `{ bpm: number; subdivision: Subdivision; isPlaying: boolean; currentPulse: number; setBpm(bpm: number): void; setSubdivision(subdivision: Subdivision): void; start(): void; stop(): void; setCurrentPulse(pulseIndex: number): void }`. Used by Task 15 (`persistence.ts`) and Task 16 (`useMetronome`, `useNotePlayback` hooks).

- [ ] **Step 1: Write the failing test**

`src/state/metronome-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useMetronomeStore } from './metronome-store';

describe('useMetronomeStore', () => {
  beforeEach(() => {
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      isPlaying: false,
      currentPulse: 0,
    });
  });

  it('defaults to 100 BPM, quarter-note subdivision, stopped', () => {
    const state = useMetronomeStore.getState();
    expect(state.bpm).toBe(100);
    expect(state.subdivision).toBe('quarter');
    expect(state.isPlaying).toBe(false);
  });

  it('updates bpm via setBpm', () => {
    useMetronomeStore.getState().setBpm(140);
    expect(useMetronomeStore.getState().bpm).toBe(140);
  });

  it('updates subdivision via setSubdivision', () => {
    useMetronomeStore.getState().setSubdivision('sixteenth');
    expect(useMetronomeStore.getState().subdivision).toBe('sixteenth');
  });

  it('flips isPlaying to true on start and false on stop', () => {
    useMetronomeStore.getState().start();
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
    useMetronomeStore.getState().stop();
    expect(useMetronomeStore.getState().isPlaying).toBe(false);
  });

  it('resets currentPulse to 0 on stop', () => {
    useMetronomeStore.getState().setCurrentPulse(3);
    useMetronomeStore.getState().stop();
    expect(useMetronomeStore.getState().currentPulse).toBe(0);
  });

  it('tracks the current pulse via setCurrentPulse', () => {
    useMetronomeStore.getState().setCurrentPulse(2);
    expect(useMetronomeStore.getState().currentPulse).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- metronome-store`
Expected: FAIL — `metronome-store.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/state/metronome-store.ts`:

```ts
import { create } from 'zustand';
import type { Subdivision } from '../domain/music-theory/rhythm';

interface MetronomeState {
  bpm: number;
  subdivision: Subdivision;
  isPlaying: boolean;
  currentPulse: number;
  setBpm: (bpm: number) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  start: () => void;
  stop: () => void;
  setCurrentPulse: (pulseIndex: number) => void;
}

export const useMetronomeStore = create<MetronomeState>((set) => ({
  bpm: 100,
  subdivision: 'quarter',
  isPlaying: false,
  currentPulse: 0,
  setBpm: (bpm) => set({ bpm }),
  setSubdivision: (subdivision) => set({ subdivision }),
  start: () => set({ isPlaying: true }),
  stop: () => set({ isPlaying: false, currentPulse: 0 }),
  setCurrentPulse: (pulseIndex) => set({ currentPulse: pulseIndex }),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- metronome-store`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/metronome-store.ts src/state/metronome-store.test.ts
git commit -m "feat(state): add metronome store"
```

---

## Task 14: State — Exercise Store

**Files:**
- Create: `src/state/exercise-store.ts`
- Test: `src/state/exercise-store.test.ts`

**Interfaces:**
- Consumes: `EXERCISE_CATALOG` from `../domain/exercises/exercise-catalog` (Task 7); `useFretboardStore` from `./fretboard-store` (Task 12).
- Produces: `useExerciseStore` exposing `{ activeExerciseId: string | null; selectExercise(id: string): void }`. Used by Task 20 (`ExerciseList.tsx`).

- [ ] **Step 1: Write the failing test**

`src/state/exercise-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useExerciseStore } from './exercise-store';
import { useFretboardStore } from './fretboard-store';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';

describe('useExerciseStore', () => {
  beforeEach(() => {
    useExerciseStore.setState({ activeExerciseId: null });
    useFretboardStore.setState({ selectedNotes: [] });
  });

  it('starts with no active exercise', () => {
    expect(useExerciseStore.getState().activeExerciseId).toBeNull();
  });

  it('sets activeExerciseId when a known exercise is selected', () => {
    const [first] = EXERCISE_CATALOG;
    useExerciseStore.getState().selectExercise(first.id);
    expect(useExerciseStore.getState().activeExerciseId).toBe(first.id);
  });

  it('loads the exercise positions into the fretboard store', () => {
    const [first] = EXERCISE_CATALOG;
    useExerciseStore.getState().selectExercise(first.id);
    expect(useFretboardStore.getState().selectedNotes).toEqual(first.positions);
  });

  it('does nothing when selecting an unknown exercise id', () => {
    useExerciseStore.getState().selectExercise('does-not-exist');
    expect(useExerciseStore.getState().activeExerciseId).toBeNull();
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- exercise-store`
Expected: FAIL — `exercise-store.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/state/exercise-store.ts`:

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
    useFretboardStore.getState().loadSequence(exercise.positions);
    set({ activeExerciseId: id });
  },
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- exercise-store`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/exercise-store.ts src/state/exercise-store.test.ts
git commit -m "feat(state): add exercise selection store wired to fretboard store"
```

---

## Task 15: State — LocalStorage Persistence

**Files:**
- Create: `src/state/persistence.ts`
- Test: `src/state/persistence.test.ts`

**Interfaces:**
- Consumes: `Subdivision` from `../domain/music-theory/rhythm`; `useFretboardStore` (Task 12); `useMetronomeStore` (Task 13); browser `localStorage` (available in jsdom test environment).
- Produces: `loadPreferences(): PersistedPreferences | null`, `savePreferences(prefs: PersistedPreferences): void`, `initPersistence(): () => void` (returns an unsubscribe function). Used by Task 21 (`main.tsx`/`App.tsx` wiring).

- [ ] **Step 1: Write the failing test**

`src/state/persistence.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadPreferences, savePreferences, initPersistence, STORAGE_KEY } from './persistence';
import { useFretboardStore } from './fretboard-store';
import { useMetronomeStore } from './metronome-store';

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    useFretboardStore.setState({ minFret: 1, maxFret: 7 });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter' });
  });

  it('returns null when nothing has been saved yet', () => {
    expect(loadPreferences()).toBeNull();
  });

  it('round-trips preferences through savePreferences/loadPreferences', () => {
    savePreferences({ bpm: 130, subdivision: 'eighth', minFret: 3, maxFret: 10 });
    expect(loadPreferences()).toEqual({ bpm: 130, subdivision: 'eighth', minFret: 3, maxFret: 10 });
  });

  it('stores preferences under the documented storage key', () => {
    savePreferences({ bpm: 130, subdivision: 'eighth', minFret: 3, maxFret: 10 });
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('persists metronome-store changes automatically once initPersistence runs', () => {
    const stop = initPersistence();
    useMetronomeStore.getState().setBpm(150);
    expect(loadPreferences()?.bpm).toBe(150);
    stop();
  });

  it('persists fretboard-store fret-range changes automatically once initPersistence runs', () => {
    const stop = initPersistence();
    useFretboardStore.getState().setFretRange(5, 12);
    expect(loadPreferences()?.minFret).toBe(5);
    expect(loadPreferences()?.maxFret).toBe(12);
    stop();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- persistence`
Expected: FAIL — `persistence.ts` does not exist yet.

- [ ] **Step 3: Implement**

`src/state/persistence.ts`:

```ts
import type { Subdivision } from '../domain/music-theory/rhythm';
import { useFretboardStore } from './fretboard-store';
import { useMetronomeStore } from './metronome-store';

export const STORAGE_KEY = 'guitar-teacher:preferences';

export interface PersistedPreferences {
  bpm: number;
  subdivision: Subdivision;
  minFret: number;
  maxFret: number;
}

export function loadPreferences(): PersistedPreferences | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as PersistedPreferences;
}

export function savePreferences(prefs: PersistedPreferences): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function currentPreferences(): PersistedPreferences {
  const metronome = useMetronomeStore.getState();
  const fretboard = useFretboardStore.getState();
  return {
    bpm: metronome.bpm,
    subdivision: metronome.subdivision,
    minFret: fretboard.minFret,
    maxFret: fretboard.maxFret,
  };
}

export function initPersistence(): () => void {
  const unsubscribeMetronome = useMetronomeStore.subscribe(() => {
    savePreferences(currentPreferences());
  });
  const unsubscribeFretboard = useFretboardStore.subscribe(() => {
    savePreferences(currentPreferences());
  });
  return () => {
    unsubscribeMetronome();
    unsubscribeFretboard();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- persistence`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/persistence.ts src/state/persistence.test.ts
git commit -m "feat(state): persist bpm/subdivision/fret-range to localStorage"
```

---

## Task 16: Hooks — Fretboard Selection, Playback, Metronome

**Files:**
- Create: `src/hooks/useFretboardSelection.ts`
- Create: `src/hooks/useNotePlayback.ts`
- Create: `src/hooks/useMetronome.ts`
- Test: `src/hooks/useFretboardSelection.test.tsx`
- Test: `src/hooks/useNotePlayback.test.tsx`
- Test: `src/hooks/useMetronome.test.tsx`

**Interfaces:**
- Consumes: `useFretboardStore` (Task 12), `useMetronomeStore` (Task 13), `getNoteAt`/`STANDARD_TUNING` (Tasks 2-3), and `sampler`/`sequencePlayer`/`metronome`/`ensureAudioStarted` from `../audio` (Task 11, mocked in tests).
- Produces: `useFretboardSelection()` returning `{ minFret, maxFret, selectedNotes, setFretRange, toggleNote, loadSequence }`; `useNotePlayback()` returning `{ play, stop, isPlaying, currentIndex }`; `useMetronome()` returning `{ bpm, subdivision, isPlaying, currentPulse, start, stop, setBpm, setSubdivision }`. Used by every component in Tasks 17-20.

- [ ] **Step 1: Write the failing tests**

`src/hooks/useFretboardSelection.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';

const playNote = vi.fn();
const ensureAudioStarted = vi.fn().mockResolvedValue(undefined);

vi.mock('../audio', () => ({
  sampler: { isLoaded: () => true, playNote },
  ensureAudioStarted,
}));

import { useFretboardSelection } from './useFretboardSelection';

describe('useFretboardSelection', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    playNote.mockClear();
    ensureAudioStarted.mockClear();
  });

  it('plays the note frequency and toggles the store entry on toggleNote', async () => {
    const { result } = renderHook(() => useFretboardSelection());

    await act(async () => {
      await result.current.toggleNote({ string: 6, fret: 0 });
    });

    expect(ensureAudioStarted).toHaveBeenCalled();
    expect(playNote).toHaveBeenCalledWith(expect.closeTo(82.41, 1), 0.5);
    expect(result.current.selectedNotes).toEqual([{ string: 6, fret: 0 }]);
  });
});
```

`src/hooks/useNotePlayback.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';

const play = vi.fn();
const stop = vi.fn();
const onNoteChange = vi.fn();
const ensureAudioStarted = vi.fn().mockResolvedValue(undefined);

vi.mock('../audio', () => ({
  sequencePlayer: { play, stop, onNoteChange: (cb: (i: number) => void) => onNoteChange(cb) },
  ensureAudioStarted,
}));

import { useNotePlayback } from './useNotePlayback';

describe('useNotePlayback', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 0 }, { string: 5, fret: 2 }] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter' });
    play.mockClear();
    stop.mockClear();
    onNoteChange.mockClear();
  });

  it('converts selected positions to notes and calls sequencePlayer.play with bpm/subdivision', async () => {
    const { result } = renderHook(() => useNotePlayback());

    await act(async () => {
      await result.current.play();
    });

    expect(play).toHaveBeenCalledTimes(1);
    const [notes, bpm, subdivision] = play.mock.calls[0];
    expect(notes).toHaveLength(2);
    expect(bpm).toBe(100);
    expect(subdivision).toBe('quarter');
  });

  it('calls sequencePlayer.stop on stop()', () => {
    const { result } = renderHook(() => useNotePlayback());
    act(() => {
      result.current.stop();
    });
    expect(stop).toHaveBeenCalled();
  });
});
```

`src/hooks/useMetronome.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMetronomeStore } from '../state/metronome-store';

const start = vi.fn();
const stop = vi.fn();
const setBpm = vi.fn();
const setSubdivision = vi.fn();
const onPulse = vi.fn();
const ensureAudioStarted = vi.fn().mockResolvedValue(undefined);

vi.mock('../audio', () => ({
  metronome: { start, stop, setBpm, setSubdivision, onPulse: (cb: (i: number) => void) => onPulse(cb) },
  ensureAudioStarted,
}));

import { useMetronome } from './useMetronome';

describe('useMetronome', () => {
  beforeEach(() => {
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, currentPulse: 0 });
    start.mockClear();
    stop.mockClear();
    setBpm.mockClear();
    setSubdivision.mockClear();
  });

  it('starts the audio engine metronome and flips the store to playing', async () => {
    const { result } = renderHook(() => useMetronome());

    await act(async () => {
      await result.current.start();
    });

    expect(ensureAudioStarted).toHaveBeenCalled();
    expect(start).toHaveBeenCalled();
    expect(result.current.isPlaying).toBe(true);
  });

  it('propagates setBpm to both the store and the audio engine', () => {
    const { result } = renderHook(() => useMetronome());
    act(() => {
      result.current.setBpm(140);
    });
    expect(result.current.bpm).toBe(140);
    expect(setBpm).toHaveBeenCalledWith(140);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- useFretboardSelection useNotePlayback useMetronome`
Expected: FAIL — hooks do not exist yet.

- [ ] **Step 3: Implement**

`src/hooks/useFretboardSelection.ts`:

```ts
import { useCallback } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import type { FretPosition } from '../domain/music-theory/tuning';
import { sampler, ensureAudioStarted } from '../audio';

export function useFretboardSelection() {
  const minFret = useFretboardStore((state) => state.minFret);
  const maxFret = useFretboardStore((state) => state.maxFret);
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const setFretRange = useFretboardStore((state) => state.setFretRange);
  const toggleNoteInStore = useFretboardStore((state) => state.toggleNote);
  const loadSequence = useFretboardStore((state) => state.loadSequence);

  const toggleNote = useCallback(
    async (position: FretPosition) => {
      await ensureAudioStarted();
      const note = getNoteAt(STANDARD_TUNING, position);
      sampler.playNote(note.frequency, 0.5);
      toggleNoteInStore(position);
    },
    [toggleNoteInStore],
  );

  return { minFret, maxFret, selectedNotes, setFretRange, toggleNote, loadSequence };
}
```

`src/hooks/useNotePlayback.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import { sequencePlayer, ensureAudioStarted } from '../audio';

export function useNotePlayback() {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => sequencePlayer.onNoteChange(setCurrentIndex), []);

  const play = useCallback(async () => {
    await ensureAudioStarted();
    const notes = selectedNotes.map((position) => getNoteAt(STANDARD_TUNING, position));
    sequencePlayer.play(notes, bpm, subdivision);
    setIsPlaying(true);
  }, [selectedNotes, bpm, subdivision]);

  const stop = useCallback(() => {
    sequencePlayer.stop();
    setIsPlaying(false);
    setCurrentIndex(null);
  }, []);

  return { play, stop, isPlaying, currentIndex };
}
```

`src/hooks/useMetronome.ts`:

```ts
import { useCallback, useEffect } from 'react';
import { useMetronomeStore } from '../state/metronome-store';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { metronome, ensureAudioStarted } from '../audio';

export function useMetronome() {
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const isPlaying = useMetronomeStore((state) => state.isPlaying);
  const currentPulse = useMetronomeStore((state) => state.currentPulse);
  const setBpmInStore = useMetronomeStore((state) => state.setBpm);
  const setSubdivisionInStore = useMetronomeStore((state) => state.setSubdivision);
  const startInStore = useMetronomeStore((state) => state.start);
  const stopInStore = useMetronomeStore((state) => state.stop);
  const setCurrentPulse = useMetronomeStore((state) => state.setCurrentPulse);

  useEffect(() => metronome.onPulse(setCurrentPulse), [setCurrentPulse]);

  const start = useCallback(async () => {
    await ensureAudioStarted();
    metronome.setBpm(bpm);
    metronome.setSubdivision(subdivision);
    metronome.start();
    startInStore();
  }, [bpm, subdivision, startInStore]);

  const stop = useCallback(() => {
    metronome.stop();
    stopInStore();
  }, [stopInStore]);

  const setBpm = useCallback(
    (newBpm: number) => {
      setBpmInStore(newBpm);
      metronome.setBpm(newBpm);
    },
    [setBpmInStore],
  );

  const setSubdivision = useCallback(
    (newSubdivision: Subdivision) => {
      setSubdivisionInStore(newSubdivision);
      metronome.setSubdivision(newSubdivision);
    },
    [setSubdivisionInStore],
  );

  return { bpm, subdivision, isPlaying, currentPulse, start, stop, setBpm, setSubdivision };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- useFretboardSelection useNotePlayback useMetronome`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useFretboardSelection.ts src/hooks/useNotePlayback.ts src/hooks/useMetronome.ts \
  src/hooks/useFretboardSelection.test.tsx src/hooks/useNotePlayback.test.tsx src/hooks/useMetronome.test.tsx
git commit -m "feat(hooks): connect state stores to the audio engine"
```

---

## Task 17: Components — Fretboard, FretMarker, FretRangeControl

**Files:**
- Create: `src/components/fretboard/FretMarker.tsx`
- Create: `src/components/fretboard/Fretboard.tsx`
- Create: `src/components/fretboard/FretRangeControl.tsx`
- Test: `src/components/fretboard/Fretboard.test.tsx`
- Test: `src/components/fretboard/FretRangeControl.test.tsx`

**Interfaces:**
- Consumes: `useFretboardSelection` (Task 16); `getNoteAt`/`STANDARD_TUNING` (Tasks 2-3); `positionsEqual` (Task 6); `FretPosition` (Task 2).
- Produces: `<Fretboard currentIndex={number | null} />` (reads selection from the hook internally), `<FretMarker position selected noteLabel highlighted onClick />`, `<FretRangeControl minFret maxFret onChange />`. Used by Task 21 (`App.tsx`).

- [ ] **Step 1: Write the failing tests**

`src/components/fretboard/Fretboard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';

const toggleNote = vi.fn();

vi.mock('../../audio', () => ({
  sampler: { isLoaded: () => true, playNote: vi.fn() },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { Fretboard } from './Fretboard';

describe('Fretboard', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7, selectedNotes: [] });
    toggleNote.mockClear();
  });

  it('renders one row per string with the string tuning label', () => {
    render(<Fretboard currentIndex={null} />);
    expect(screen.getByText('E2')).toBeInTheDocument();
    expect(screen.getByText('E4')).toBeInTheDocument();
  });

  it('renders a clickable cell for every string/fret combination in range', () => {
    render(<Fretboard currentIndex={null} />);
    // 6 strings x 7 frets (1-7) = 42 fret cells
    expect(screen.getAllByRole('button')).toHaveLength(42);
  });

  it('marks a cell as pressed after it is clicked', () => {
    render(<Fretboard currentIndex={null} />);
    const cell = screen.getByRole('button', { name: /corda 6, casa 1/i });
    fireEvent.click(cell);
    expect(useFretboardStore.getState().selectedNotes).toEqual([{ string: 6, fret: 1 }]);
  });
});
```

`src/components/fretboard/FretRangeControl.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FretRangeControl } from './FretRangeControl';

describe('FretRangeControl', () => {
  it('calls onChange with an incremented range when "next" is clicked', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={7} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /pr[oó]ximo/i }));
    expect(onChange).toHaveBeenCalledWith(2, 8);
  });

  it('calls onChange with a decremented range when "previous" is clicked, floored at fret 0', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={7} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    expect(onChange).toHaveBeenCalledWith(0, 6);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- Fretboard FretRangeControl`
Expected: FAIL — components do not exist yet.

- [ ] **Step 3: Implement**

`src/components/fretboard/FretMarker.tsx`:

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
        'flex h-10 w-14 items-center justify-center border-r border-neutral-700 text-xs font-medium transition-colors',
        highlighted ? 'bg-amber-400 text-neutral-900' : selected ? 'bg-neutral-300 text-neutral-900' : 'bg-neutral-900 text-neutral-500 hover:bg-neutral-800',
      ].join(' ')}
    >
      {selected ? noteLabel : ''}
    </button>
  );
}
```

`src/components/fretboard/Fretboard.tsx`:

```tsx
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { getNoteAt } from '../../domain/music-theory/notes';
import { positionsEqual } from '../../domain/fretboard/fretboard-model';
import { FretMarker } from './FretMarker';

const STRING_ORDER: StringNumber[] = [6, 5, 4, 3, 2, 1];

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
          <span className="w-10 text-center text-sm text-neutral-400">{STANDARD_TUNING[string]}</span>
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
    const nextMin = Math.max(0, minFret - 1);
    onChange(nextMin, nextMin + span);
  };

  const goToNext = () => {
    onChange(minFret + 1, maxFret + 1);
  };

  return (
    <div className="flex items-center gap-2 text-sm text-neutral-300">
      <button type="button" onClick={goToPrevious} className="rounded bg-neutral-800 px-2 py-1">
        Anterior
      </button>
      <span>
        Casas {minFret}-{maxFret}
      </span>
      <button type="button" onClick={goToNext} className="rounded bg-neutral-800 px-2 py-1">
        Próximo
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- Fretboard FretRangeControl`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/fretboard
git commit -m "feat(components): add horizontal fretboard grid with range control"
```

---

## Task 18: Components — Metronome Controls and Pulse Indicator

**Files:**
- Create: `src/components/metronome/MetronomeControls.tsx`
- Create: `src/components/metronome/PulseIndicator.tsx`
- Test: `src/components/metronome/MetronomeControls.test.tsx`
- Test: `src/components/metronome/PulseIndicator.test.tsx`

**Interfaces:**
- Consumes: `useMetronome` (Task 16); `Subdivision` (Task 2).
- Produces: `<MetronomeControls />` (self-contained, reads/writes via the hook), `<PulseIndicator currentPulse={number} isPlaying={boolean} />`. Used by Task 21 (`App.tsx`).

- [ ] **Step 1: Write the failing tests**

`src/components/metronome/MetronomeControls.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useMetronomeStore } from '../../state/metronome-store';

vi.mock('../../audio', () => ({
  metronome: { start: vi.fn(), stop: vi.fn(), setBpm: vi.fn(), setSubdivision: vi.fn(), onPulse: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { MetronomeControls } from './MetronomeControls';

describe('MetronomeControls', () => {
  beforeEach(() => {
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter', isPlaying: false, currentPulse: 0 });
  });

  it('shows the current BPM', () => {
    render(<MetronomeControls />);
    expect(screen.getByText('100 BPM')).toBeInTheDocument();
  });

  it('increases BPM by 5 when the + button is clicked', () => {
    render(<MetronomeControls />);
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(useMetronomeStore.getState().bpm).toBe(105);
  });

  it('decreases BPM by 5 when the - button is clicked', () => {
    render(<MetronomeControls />);
    fireEvent.click(screen.getByRole('button', { name: '-' }));
    expect(useMetronomeStore.getState().bpm).toBe(95);
  });

  it('updates the subdivision when a new one is selected', () => {
    render(<MetronomeControls />);
    fireEvent.change(screen.getByLabelText(/figura r[ií]tmica/i), { target: { value: 'eighth' } });
    expect(useMetronomeStore.getState().subdivision).toBe('eighth');
  });
});
```

`src/components/metronome/PulseIndicator.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PulseIndicator } from './PulseIndicator';

describe('PulseIndicator', () => {
  it('is dim when not playing', () => {
    render(<PulseIndicator currentPulse={0} isPlaying={false} />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-neutral-700');
  });

  it('is lit when playing', () => {
    render(<PulseIndicator currentPulse={2} isPlaying />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-amber-400');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- MetronomeControls PulseIndicator`
Expected: FAIL — components do not exist yet.

- [ ] **Step 3: Implement**

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
  const { bpm, subdivision, isPlaying, setBpm, setSubdivision, start, stop } = useMetronome();

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

      <button
        type="button"
        onClick={() => (isPlaying ? stop() : start())}
        className="rounded bg-amber-500 px-3 py-1 text-neutral-900"
      >
        {isPlaying ? 'Parar' : 'Iniciar'} metrônomo
      </button>
    </div>
  );
}
```

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
      className={`h-4 w-4 rounded-full ${isPlaying ? 'bg-amber-400' : 'bg-neutral-700'}`}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- MetronomeControls PulseIndicator`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/metronome
git commit -m "feat(components): add metronome controls and pulse indicator"
```

---

## Task 19: Components — Play Button

**Files:**
- Create: `src/components/player/PlayButton.tsx`
- Test: `src/components/player/PlayButton.test.tsx`

**Interfaces:**
- Consumes: `useNotePlayback` (Task 16).
- Produces: `<PlayButton />` (self-contained). Its `currentIndex` value is what `App.tsx` (Task 21) forwards into `<Fretboard currentIndex={...} />` for the live highlight.

- [ ] **Step 1: Write the failing test**

`src/components/player/PlayButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';

const play = vi.fn();
const stop = vi.fn();

vi.mock('../../audio', () => ({
  sequencePlayer: { play, stop, onNoteChange: () => () => {} },
  ensureAudioStarted: vi.fn().mockResolvedValue(undefined),
}));

import { PlayButton } from './PlayButton';

describe('PlayButton', () => {
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 0 }] });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter' });
    play.mockClear();
    stop.mockClear();
  });

  it('shows "Play" initially and starts playback on click', async () => {
    render(<PlayButton />);
    const button = screen.getByRole('button', { name: /play/i });
    await fireEvent.click(button);
    expect(play).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- PlayButton`
Expected: FAIL — `PlayButton.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/components/player/PlayButton.tsx`:

```tsx
import { useNotePlayback } from '../../hooks/useNotePlayback';

export function PlayButton() {
  const { play, stop, isPlaying } = useNotePlayback();

  return (
    <button
      type="button"
      onClick={() => (isPlaying ? stop() : play())}
      className="rounded bg-emerald-500 px-4 py-2 font-semibold text-neutral-900"
    >
      {isPlaying ? 'Parar' : 'Play'}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- PlayButton`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/player
git commit -m "feat(components): add play/stop button for the marked sequence"
```

---

## Task 20: Components — Exercise List

**Files:**
- Create: `src/components/exercises/ExerciseList.tsx`
- Test: `src/components/exercises/ExerciseList.test.tsx`

**Interfaces:**
- Consumes: `EXERCISE_CATALOG` (Task 7); `useExerciseStore` (Task 14).
- Produces: `<ExerciseList />` (self-contained). Used by Task 21 (`App.tsx`).

- [ ] **Step 1: Write the failing test**

`src/components/exercises/ExerciseList.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useExerciseStore } from '../../state/exercise-store';
import { useFretboardStore } from '../../state/fretboard-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import { ExerciseList } from './ExerciseList';

describe('ExerciseList', () => {
  beforeEach(() => {
    useExerciseStore.setState({ activeExerciseId: null });
    useFretboardStore.setState({ selectedNotes: [] });
  });

  it('renders every exercise name from the catalog', () => {
    render(<ExerciseList />);
    for (const exercise of EXERCISE_CATALOG) {
      expect(screen.getByText(exercise.name)).toBeInTheDocument();
    }
  });

  it('loads the exercise into the fretboard when clicked', () => {
    render(<ExerciseList />);
    const [first] = EXERCISE_CATALOG;
    fireEvent.click(screen.getByText(first.name));
    expect(useFretboardStore.getState().selectedNotes).toEqual(first.positions);
    expect(useExerciseStore.getState().activeExerciseId).toBe(first.id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ExerciseList`
Expected: FAIL — `ExerciseList.tsx` does not exist yet.

- [ ] **Step 3: Implement**

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
            className="w-full rounded bg-neutral-800 px-3 py-2 text-left text-neutral-200 hover:bg-neutral-700"
          >
            <span className="mr-2 text-xs uppercase text-neutral-500">
              {CATEGORY_LABELS[exercise.category]}
            </span>
            {exercise.name}
          </button>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ExerciseList`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/exercises
git commit -m "feat(components): add predefined exercise list"
```

---

## Task 21: App Wiring and Manual Verification

**Files:**
- Create: `src/components/layout/App.tsx`
- Modify: `src/main.tsx`
- Test: `src/components/layout/App.test.tsx`

**Interfaces:**
- Consumes: `Fretboard`, `FretRangeControl` (Task 17), `MetronomeControls`, `PulseIndicator` (Task 18), `PlayButton` (Task 19), `ExerciseList` (Task 20), `useFretboardSelection` (Task 16), `useNotePlayback` (Task 16), `useMetronome` (Task 16), `loadPreferences`/`initPersistence` (Task 15).
- Produces: the assembled `<App />` rendered by `main.tsx`.

- [ ] **Step 1: Write the failing test**

`src/components/layout/App.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';

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
  });

  it('renders the fretboard, play button, metronome controls and exercise list together', () => {
    render(<App />);
    expect(screen.getAllByRole('button', { name: /corda \d, casa \d+/ }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /exerc[ií]cios/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- App`
Expected: FAIL — `App.tsx` does not exist yet.

- [ ] **Step 3: Implement**

`src/components/layout/App.tsx`:

```tsx
import { useEffect } from 'react';
import { Fretboard } from '../fretboard/Fretboard';
import { FretRangeControl } from '../fretboard/FretRangeControl';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { PulseIndicator } from '../metronome/PulseIndicator';
import { PlayButton } from '../player/PlayButton';
import { ExerciseList } from '../exercises/ExerciseList';
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';

export function App() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse } = useMetronome();

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

      <div className="mb-4 flex items-center gap-4">
        <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
        <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
      </div>

      <Fretboard currentIndex={currentIndex} />

      <div className="mt-6 flex items-center gap-6">
        <PlayButton />
        <MetronomeControls />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Exercícios</h2>
        <ExerciseList />
      </div>
    </div>
  );
}
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/layout/App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- App`
Expected: PASS

Run: `npm run test`
Expected: PASS (entire suite, every task's tests together)

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev`, open the printed local URL in a browser, and verify:
1. The fretboard renders horizontally with 6 rows (E2 at the top, E4 at the bottom) and frets 1-7.
2. Clicking a fret cell plays a guitar sample sound and highlights the cell with its note name.
3. Clicking `Play` plays back the clicked cells in click order, synchronized with the metronome.
4. Starting the metronome alone (no notes marked) produces an audible click and a pulsing visual indicator.
5. Changing BPM/subdivision and reloading the page preserves those settings (persisted via localStorage).
6. Clicking an item in the exercise list populates the fretboard with that exercise's positions.

- [ ] **Step 6: Commit**

```bash
git add src/components/layout src/main.tsx
git commit -m "feat: wire fretboard, player, metronome and exercises into App"
```

---

## Self-Review Notes

- **Spec coverage:** every functional requirement in the spec (horizontal 6-string fretboard with EADGBE, click-to-mark ordered sequence with immediate note preview, Play/sequence playback, predefined exercises catalog, BPM/subdivision-configurable metronome synchronized with playback, localStorage persistence of BPM/subdivision/fret-range) maps to a task above (Tasks 2-3 tuning/notes, 12/17 fretboard interaction, 5/7 scales/exercises, 8-11 audio engine, 9/13/18 metronome, 10/16/19 sequence playback, 15 persistence).
- **Type consistency verified:** `FretPosition`, `Tuning`, `Subdivision`, `Note`, `INoteSampler`/`IMetronome`/`ISequencePlayer`, and every store's public method signatures are defined once (Tasks 2, 3, 8) and reused verbatim by every later task's Interfaces block.
- **Out of scope confirmed absent from tasks:** no chord/simultaneous-note handling, no per-note rhythm, no backend/auth, no UI-based exercise authoring — matching the spec's Section 10.

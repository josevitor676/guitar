# Rhythm Figure: By Note vs. By String Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "por corda" rhythm mode alongside the existing "por nota" (global) mode, where each of the 6 strings can have its own rhythm figure controlling how long its notes sustain — without changing the fixed spacing between notes in a played sequence.

**Architecture:** The rhythm-mode/per-string state lives in `metronome-store.ts`. `useNotePlayback` resolves each selected note's sustain duration (global or per-string, depending on mode) before handing the notes to the audio engine. `ISequencePlayer.play()` changes its signature so each note already carries its own resolved duration string — the audio engine stays unaware of rhythm modes entirely, only the hook layer knows about them.

**Tech Stack:** React 19, TypeScript, Zustand, Tone.js, Vitest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-30-rhythm-by-string-design.md`

## Global Constraints

- The spacing/timing between notes in a sequence stays uniform, always driven by the global `subdivision` (never per-string) — only sustain duration varies per string in "string" mode.
- `rhythmMode`/`subdivisionByString` are NOT persisted to localStorage in this version.
- No changes to `src/domain/**`, `src/state/fretboard-store.ts`, `src/state/playback-store.ts`, or `FretPosition`'s shape.
- `subdivisionByString` defaults to `'quarter'` for all 6 strings, so switching to "string" mode with no prior customization behaves identically to "note" mode at BPM/quarter defaults.

---

## Task 1: Metronome Store — Rhythm Mode and Per-String Subdivisions

**Files:**
- Modify: `src/state/metronome-store.ts`
- Modify: `src/state/metronome-store.test.ts`

**Interfaces:**
- Produces: `RhythmMode = 'note' | 'string'`; `useMetronomeStore` gains `rhythmMode: RhythmMode`, `subdivisionByString: Record<StringNumber, Subdivision>`, `setRhythmMode: (mode: RhythmMode) => void`, `setStringSubdivision: (string: StringNumber, subdivision: Subdivision) => void`. Used by Task 3 (`useNotePlayback`) and Task 4 (`useMetronome`).

- [ ] **Step 1: Write the failing tests**

Update the `beforeEach` in `src/state/metronome-store.test.ts` to also reset the two new fields (so later tests in this file, and other test files sharing this module-level store, always start from a known state):

```ts
  beforeEach(() => {
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
      isPlaying: false,
      currentPulse: 0,
    });
  });
```

Add these three new tests to the existing `describe('useMetronomeStore', ...)` block:

```ts
  it('defaults to note mode with every string set to quarter subdivision', () => {
    const state = useMetronomeStore.getState();
    expect(state.rhythmMode).toBe('note');
    expect(state.subdivisionByString).toEqual({
      1: 'quarter',
      2: 'quarter',
      3: 'quarter',
      4: 'quarter',
      5: 'quarter',
      6: 'quarter',
    });
  });

  it('switches rhythm mode via setRhythmMode', () => {
    useMetronomeStore.getState().setRhythmMode('string');
    expect(useMetronomeStore.getState().rhythmMode).toBe('string');
  });

  it('updates only the targeted string via setStringSubdivision', () => {
    useMetronomeStore.getState().setStringSubdivision(6, 'eighth');
    const { subdivisionByString } = useMetronomeStore.getState();
    expect(subdivisionByString[6]).toBe('eighth');
    expect(subdivisionByString[1]).toBe('quarter');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- metronome-store`
Expected: FAIL — `rhythmMode`, `subdivisionByString`, `setRhythmMode`, `setStringSubdivision` don't exist yet on the store.

- [ ] **Step 3: Implement**

Replace the full contents of `src/state/metronome-store.ts`:

```ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Subdivision } from '../domain/music-theory/rhythm';
import type { StringNumber } from '../domain/music-theory/tuning';

export type RhythmMode = 'note' | 'string';

interface MetronomeState {
  bpm: number;
  subdivision: Subdivision;
  rhythmMode: RhythmMode;
  subdivisionByString: Record<StringNumber, Subdivision>;
  isPlaying: boolean;
  currentPulse: number;
  setBpm: (bpm: number) => void;
  setSubdivision: (subdivision: Subdivision) => void;
  setRhythmMode: (mode: RhythmMode) => void;
  setStringSubdivision: (string: StringNumber, subdivision: Subdivision) => void;
  start: () => void;
  stop: () => void;
  setCurrentPulse: (pulseIndex: number) => void;
}

const DEFAULT_SUBDIVISION_BY_STRING: Record<StringNumber, Subdivision> = {
  1: 'quarter',
  2: 'quarter',
  3: 'quarter',
  4: 'quarter',
  5: 'quarter',
  6: 'quarter',
};

export const useMetronomeStore = create<MetronomeState>()(
  subscribeWithSelector((set) => ({
    bpm: 100,
    subdivision: 'quarter',
    rhythmMode: 'note',
    subdivisionByString: DEFAULT_SUBDIVISION_BY_STRING,
    isPlaying: false,
    currentPulse: 0,
    setBpm: (bpm) => set({ bpm }),
    setSubdivision: (subdivision) => set({ subdivision }),
    setRhythmMode: (rhythmMode) => set({ rhythmMode }),
    setStringSubdivision: (string, subdivision) =>
      set((state) => ({
        subdivisionByString: { ...state.subdivisionByString, [string]: subdivision },
      })),
    start: () => set({ isPlaying: true }),
    stop: () => set({ isPlaying: false, currentPulse: 0 }),
    setCurrentPulse: (pulseIndex) => set({ currentPulse: pulseIndex }),
  })),
);
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- metronome-store`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state/metronome-store.ts src/state/metronome-store.test.ts
git commit -m "feat(state): add rhythm mode and per-string subdivisions to metronome store"
```

---

## Task 2: Audio Engine — Per-Note Duration in ISequencePlayer

**Files:**
- Modify: `src/audio/audio-engine.types.ts`
- Modify: `src/audio/sequence-player.ts`
- Modify: `src/audio/sequence-player.test.ts`

**Interfaces:**
- Produces: `ISequencePlayer.play(notes: { frequency: number; duration: string }[], bpm: number, spacingSubdivision: Subdivision): void` (was `play(notes: { frequency: number }[], bpm: number, subdivision: Subdivision): void`). `ToneSequencePlayer` now reads `note.duration` per note instead of computing one shared duration from the third argument, which becomes purely the `Tone.Sequence`'s step interval. Used by Task 3 (`useNotePlayback`), which is the only production call site.

- [ ] **Step 1: Update the tests**

Replace the full contents of `src/audio/sequence-player.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INoteSampler } from './audio-engine.types';

const sequenceStart = vi.fn();
const sequenceDispose = vi.fn();
const transportStart = vi.fn();
const transportStop = vi.fn();

let capturedCallback: ((time: number, index: number) => void) | undefined;
let capturedEvents: number[] | undefined;
let capturedInterval: string | undefined;

vi.mock('tone', () => {
  return {
    Sequence: vi.fn().mockImplementation(
      function (callback: (time: number, index: number) => void, events: number[], interval: string) {
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
      start: () => transportStart(),
      stop: () => transportStop(),
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
    transportStop.mockClear();
    capturedCallback = undefined;
  });

  it('sets the transport BPM and schedules one event per note, using the spacing subdivision as the step interval', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play(
      [
        { frequency: 220, duration: '8n' },
        { frequency: 440, duration: '8n' },
      ],
      100,
      'eighth',
    );

    expect(Tone.Transport.bpm.value).toBe(100);
    expect(capturedEvents).toEqual([0, 1]);
    expect(capturedInterval).toBe('8n');
    expect(transportStart).toHaveBeenCalled();
  });

  it("plays each note with its own duration, independent of the sequence's spacing subdivision", () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    // Spacing is 'quarter' (4n), but the second note carries its own '8n'
    // duration — proving playNote uses the note's duration, not the spacing.
    player.play(
      [
        { frequency: 220, duration: '4n' },
        { frequency: 440, duration: '8n' },
      ],
      100,
      'quarter',
    );

    capturedCallback?.(0, 1);
    expect(sampler.playNote).toHaveBeenCalledWith(440, '8n');
  });

  it('notifies note-change listeners with the current index', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    const onNoteChange = vi.fn();
    player.onNoteChange(onNoteChange);
    player.play([{ frequency: 220, duration: '4n' }], 100, 'quarter');

    capturedCallback?.(0, 0);
    expect(onNoteChange).toHaveBeenCalledWith(0);
  });

  it('disposes the previous sequence when stop is called', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play([{ frequency: 220, duration: '4n' }], 100, 'quarter');
    player.stop();
    expect(sequenceDispose).toHaveBeenCalled();
  });

  it('resets the transport position before starting, so a second play() always restarts from the beginning of the sequence', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);

    player.play(
      [
        { frequency: 220, duration: '4n' },
        { frequency: 440, duration: '4n' },
      ],
      100,
      'quarter',
    );
    player.stop();
    transportStop.mockClear();
    transportStart.mockClear();

    player.play(
      [
        { frequency: 220, duration: '4n' },
        { frequency: 440, duration: '4n' },
      ],
      100,
      'quarter',
    );

    expect(transportStop).toHaveBeenCalled();
    const stopOrder = transportStop.mock.invocationCallOrder[0];
    const startOrder = transportStart.mock.invocationCallOrder[0];
    expect(stopOrder).toBeLessThan(startOrder);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- sequence-player`
Expected: FAIL — the current `ToneSequencePlayer.play()` still computes one shared duration from the third argument via `SUBDIVISION_DURATIONS[spacingSubdivision]`, ignoring any `duration` field on the note objects, so the "plays each note with its own duration" test fails (it would call `playNote(440, '4n')`, not `'8n'`).

- [ ] **Step 3: Implement**

Replace the `ISequencePlayer` interface in `src/audio/audio-engine.types.ts` (the `INoteSampler`/`IMetronome` interfaces above it stay exactly as they are):

```ts
export interface ISequencePlayer {
  play(notes: { frequency: number; duration: string }[], bpm: number, spacingSubdivision: Subdivision): void;
  stop(): void;
  onNoteChange(callback: (index: number) => void): () => void;
}
```

Replace the full contents of `src/audio/sequence-player.ts`:

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

  play(notes: { frequency: number; duration: string }[], bpm: number, spacingSubdivision: Subdivision): void {
    this.stop();
    Tone.Transport.stop();
    Tone.Transport.bpm.value = bpm;
    const spacing = SUBDIVISION_DURATIONS[spacingSubdivision];
    this.sequence = new Tone.Sequence(
      (_time, index: number) => {
        const note = notes[index];
        this.sampler.playNote(note.frequency, note.duration);
        this.listeners.forEach((listener) => listener(index));
      },
      notes.map((_, index) => index),
      spacing,
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

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- sequence-player`
Expected: PASS

Note: `npm run build`/`npm run test` for the FULL suite will still fail at this point, because `useNotePlayback.ts` (Task 3) still calls `sequencePlayer.play(notes, bpm, subdivision)` with the OLD note shape (`{ frequency }[]`, no `duration`). That's expected and fixed in the next task — don't attempt to fix `useNotePlayback.ts` in this task.

- [ ] **Step 5: Commit**

```bash
git add src/audio/audio-engine.types.ts src/audio/sequence-player.ts src/audio/sequence-player.test.ts
git commit -m "feat(audio): make ISequencePlayer take a resolved duration per note"
```

---

## Task 3: useNotePlayback — Resolve Duration Per Note

**Files:**
- Modify: `src/hooks/useNotePlayback.ts`
- Modify: `src/hooks/useNotePlayback.test.tsx`

**Interfaces:**
- Consumes: `rhythmMode`, `subdivisionByString` from `useMetronomeStore` (Task 1); `ISequencePlayer.play()`'s new signature (Task 2); `SUBDIVISION_DURATIONS` from `../domain/music-theory/rhythm` (already exists).
- Produces: no change to `useNotePlayback`'s returned shape (`{ play, stop, isPlaying, currentIndex }`).

- [ ] **Step 1: Update the tests**

In `src/hooks/useNotePlayback.test.tsx`, update the `beforeEach` to also set the two new metronome-store fields (the store is a module-level singleton, so without this reset, a stray `rhythmMode: 'string'` from another test could leak in):

```tsx
  beforeEach(() => {
    useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 0 }, { string: 5, fret: 2 }] });
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
    });
    usePlaybackStore.setState({ isPlaying: false, currentIndex: null });
    play.mockClear();
    stop.mockClear();
    onNoteChange.mockClear();
  });
```

Add this new test to the existing `describe('useNotePlayback', ...)` block:

```tsx
  it('uses the per-string subdivision duration when rhythmMode is "string"', async () => {
    useFretboardStore.setState({
      selectedNotes: [
        { string: 6, fret: 0 },
        { string: 1, fret: 0 },
      ],
    });
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'string',
      subdivisionByString: { 1: 'sixteenth', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'eighth' },
    });

    const { result } = renderHook(() => useNotePlayback());
    await act(async () => {
      await result.current.play();
    });

    const [notes] = play.mock.calls[0];
    expect(notes[0].duration).toBe('8n');
    expect(notes[1].duration).toBe('16n');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- useNotePlayback`
Expected: FAIL — the current `play()` doesn't add a `duration` field to each note, and calls `sequencePlayer.play` with the old two-argument-per-note shape.

- [ ] **Step 3: Implement**

Replace the full contents of `src/hooks/useNotePlayback.ts`:

```ts
import { useCallback, useEffect } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { usePlaybackStore } from '../state/playback-store';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';
import { sequencePlayer, ensureAudioStarted } from '../audio';

export function useNotePlayback() {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const rhythmMode = useMetronomeStore((state) => state.rhythmMode);
  const subdivisionByString = useMetronomeStore((state) => state.subdivisionByString);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const setCurrentIndex = usePlaybackStore((state) => state.setCurrentIndex);
  const setIsPlaying = usePlaybackStore((state) => state.setIsPlaying);

  useEffect(() => sequencePlayer.onNoteChange(setCurrentIndex), [setCurrentIndex]);

  const play = useCallback(async () => {
    setCurrentIndex(null);
    await ensureAudioStarted();
    const notes = selectedNotes.map((position) => {
      const note = getNoteAt(STANDARD_TUNING, position);
      const subdivisionForNote = rhythmMode === 'string' ? subdivisionByString[position.string] : subdivision;
      return { frequency: note.frequency, duration: SUBDIVISION_DURATIONS[subdivisionForNote] };
    });
    sequencePlayer.play(notes, bpm, subdivision);
    setIsPlaying(true);
  }, [selectedNotes, bpm, subdivision, rhythmMode, subdivisionByString, setIsPlaying, setCurrentIndex]);

  const stop = useCallback(() => {
    sequencePlayer.stop();
    setIsPlaying(false);
    setCurrentIndex(null);
  }, [setIsPlaying, setCurrentIndex]);

  return { play, stop, isPlaying, currentIndex };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- useNotePlayback`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite — Tasks 1-3 combined now form a complete, working slice: `MetronomeControls`/`useMetronome` haven't changed yet, so the UI still only shows the "note" mode, but the underlying plumbing for "string" mode is fully wired and tested)

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useNotePlayback.ts src/hooks/useNotePlayback.test.tsx
git commit -m "feat(hooks): resolve per-note sustain duration from rhythm mode"
```

---

## Task 4: useMetronome — Expose Rhythm Mode and Per-String Actions

**Files:**
- Modify: `src/hooks/useMetronome.ts`
- Modify: `src/hooks/useMetronome.test.tsx`

**Interfaces:**
- Consumes: `rhythmMode`, `subdivisionByString`, `setRhythmMode`, `setStringSubdivision` from `useMetronomeStore` (Task 1).
- Produces: `useMetronome()` now also returns `rhythmMode: RhythmMode`, `subdivisionByString: Record<StringNumber, Subdivision>`, `setRhythmMode: (mode: RhythmMode) => void`, `setStringSubdivision: (string: StringNumber, subdivision: Subdivision) => void`, alongside its existing fields (`bpm`, `subdivision`, `isPlaying`, `currentPulse`, `start`, `stop`, `setBpm`, `setSubdivision`). Used by Task 5 (`MetronomeControls`).

- [ ] **Step 1: Update the tests**

In `src/hooks/useMetronome.test.tsx`, update the `beforeEach` to also reset the two new store fields:

```tsx
  beforeEach(() => {
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
      isPlaying: false,
      currentPulse: 0,
    });
    start.mockClear();
    stop.mockClear();
    setBpm.mockClear();
    setSubdivision.mockClear();
  });
```

Add these two new tests to the existing `describe('useMetronome', ...)` block:

```tsx
  it('exposes rhythmMode from the store, with setRhythmMode updating it', () => {
    const { result } = renderHook(() => useMetronome());
    expect(result.current.rhythmMode).toBe('note');

    act(() => {
      result.current.setRhythmMode('string');
    });

    expect(result.current.rhythmMode).toBe('string');
  });

  it('updates only the targeted string via setStringSubdivision', () => {
    const { result } = renderHook(() => useMetronome());

    act(() => {
      result.current.setStringSubdivision(6, 'eighth');
    });

    expect(result.current.subdivisionByString[6]).toBe('eighth');
    expect(result.current.subdivisionByString[1]).toBe('quarter');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- useMetronome`
Expected: FAIL — `useMetronome()`'s returned object doesn't have `rhythmMode`, `subdivisionByString`, `setRhythmMode`, or `setStringSubdivision` yet.

- [ ] **Step 3: Implement**

Replace the full contents of `src/hooks/useMetronome.ts`:

```ts
import { useCallback, useEffect } from 'react';
import { useMetronomeStore } from '../state/metronome-store';
import type { Subdivision } from '../domain/music-theory/rhythm';
import type { StringNumber } from '../domain/music-theory/tuning';
import { metronome, ensureAudioStarted } from '../audio';

export function useMetronome() {
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const rhythmMode = useMetronomeStore((state) => state.rhythmMode);
  const subdivisionByString = useMetronomeStore((state) => state.subdivisionByString);
  const isPlaying = useMetronomeStore((state) => state.isPlaying);
  const currentPulse = useMetronomeStore((state) => state.currentPulse);
  const setBpmInStore = useMetronomeStore((state) => state.setBpm);
  const setSubdivisionInStore = useMetronomeStore((state) => state.setSubdivision);
  const setRhythmMode = useMetronomeStore((state) => state.setRhythmMode);
  const setStringSubdivision = useMetronomeStore((state) => state.setStringSubdivision);
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

  return {
    bpm,
    subdivision,
    rhythmMode,
    subdivisionByString,
    isPlaying,
    currentPulse,
    start,
    stop,
    setBpm,
    setSubdivision,
    setRhythmMode,
    setStringSubdivision,
  };
}
```

`setRhythmMode` and `setStringSubdivision` are returned directly from the store (no wrapping `useCallback`, and no call into the `metronome` audio engine) because — per the spec — per-string rhythm only affects note *sustain* duration, resolved later in `useNotePlayback`; it has no effect on the metronome's own click, which `ToneMetronome` still drives solely from the global `subdivision`.

Note the `StringNumber` import is currently unused in the function body itself (it only appears in the JSDoc-less type of `setStringSubdivision`, which is inferred from the store) — TypeScript will still require it if you add an explicit type annotation anywhere; if `tsc` reports it as unused, it's safe to remove, since the store's own `setStringSubdivision` signature already carries the type.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- useMetronome`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

Run: `npm run build`
Expected: PASS (if `tsc` flags the `StringNumber` import as unused, remove it — it's not required for the code to work, only potentially for an explicit type annotation you choose not to add)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMetronome.ts src/hooks/useMetronome.test.tsx
git commit -m "feat(hooks): expose rhythm mode and per-string subdivision actions from useMetronome"
```

---

## Task 5: MetronomeControls — Mode Toggle and Per-String Selectors

**Files:**
- Modify: `src/components/metronome/MetronomeControls.tsx`
- Modify: `src/components/metronome/MetronomeControls.test.tsx`

**Interfaces:**
- Consumes: `rhythmMode`, `subdivisionByString`, `setRhythmMode`, `setStringSubdivision` from `useMetronome()` (Task 4); `getPitchClass` from `../../domain/music-theory/notes` (already exists); `STANDARD_TUNING`, `StringNumber` from `../../domain/music-theory/tuning` (already exist).
- Produces: no external prop change — `MetronomeControls` still takes no props.

- [ ] **Step 1: Write the failing tests**

Add these tests to the existing `describe('MetronomeControls', ...)` block in `src/components/metronome/MetronomeControls.test.tsx` (leave the existing 5 tests untouched, and update the `beforeEach` to also set the two new store fields):

```tsx
describe('MetronomeControls', () => {
  beforeEach(() => {
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
      isPlaying: false,
      currentPulse: 0,
    });
  });

  // ...existing 5 tests stay here, unchanged...

  it('shows the single global rhythm-figure selector in "Por nota" mode by default', () => {
    render(<MetronomeControls />);
    expect(screen.getByLabelText(/figura r[ií]tmica/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('combobox')).toHaveLength(1);
  });

  it('switches to six per-string selectors when "Por corda" is clicked', () => {
    render(<MetronomeControls />);
    fireEvent.click(screen.getByRole('button', { name: /por corda/i }));

    expect(useMetronomeStore.getState().rhythmMode).toBe('string');
    expect(screen.getAllByRole('combobox')).toHaveLength(6);
  });

  it('updates only the targeted string\'s subdivision when its selector changes', () => {
    useMetronomeStore.setState({ rhythmMode: 'string' });
    render(<MetronomeControls />);

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'sixteenth' } });

    const { subdivisionByString } = useMetronomeStore.getState();
    expect(subdivisionByString[1]).toBe('sixteenth');
    expect(subdivisionByString[6]).toBe('quarter');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- MetronomeControls`
Expected: FAIL — there is no "Por corda"/"Por nota" button yet, and the component always renders exactly one `<select>`.

- [ ] **Step 3: Implement**

Replace the full contents of `src/components/metronome/MetronomeControls.tsx`:

```tsx
import type { Subdivision } from '../../domain/music-theory/rhythm';
import type { StringNumber } from '../../domain/music-theory/tuning';
import { STANDARD_TUNING } from '../../domain/music-theory/tuning';
import { getPitchClass } from '../../domain/music-theory/notes';
import { useMetronome } from '../../hooks/useMetronome';

const SUBDIVISION_LABELS: Record<Subdivision, string> = {
  quarter: 'Semínima',
  eighth: 'Colcheia',
  triplet: 'Tercina',
  sixteenth: 'Semicolcheia',
};

const STRING_ORDER: StringNumber[] = [1, 2, 3, 4, 5, 6];

function SubdivisionSelect({ value, onChange }: { value: Subdivision; onChange: (value: Subdivision) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as Subdivision)}
      className="rounded-full border border-white/10 bg-surface px-2 py-1 text-text-primary transition-all duration-200"
    >
      {Object.entries(SUBDIVISION_LABELS).map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function MetronomeControls() {
  const {
    bpm,
    subdivision,
    rhythmMode,
    subdivisionByString,
    setBpm,
    setSubdivision,
    setRhythmMode,
    setStringSubdivision,
  } = useMetronome();

  return (
    <div className="flex flex-col gap-3 text-sm text-text-secondary">
      <div className="flex items-center gap-4">
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

        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-surface p-1">
          <button
            type="button"
            onClick={() => setRhythmMode('note')}
            aria-pressed={rhythmMode === 'note'}
            className={`rounded-full px-2 py-0.5 transition-all duration-200 ${
              rhythmMode === 'note' ? 'bg-white/10 text-text-primary' : 'text-text-secondary'
            }`}
          >
            Por nota
          </button>
          <button
            type="button"
            onClick={() => setRhythmMode('string')}
            aria-pressed={rhythmMode === 'string'}
            className={`rounded-full px-2 py-0.5 transition-all duration-200 ${
              rhythmMode === 'string' ? 'bg-white/10 text-text-primary' : 'text-text-secondary'
            }`}
          >
            Por corda
          </button>
        </div>
      </div>

      {rhythmMode === 'note' ? (
        <label className="flex items-center gap-2">
          Figura rítmica
          <SubdivisionSelect value={subdivision} onChange={setSubdivision} />
        </label>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {STRING_ORDER.map((string) => (
            <label key={string} className="flex items-center gap-1">
              {getPitchClass(STANDARD_TUNING[string])}
              <SubdivisionSelect
                value={subdivisionByString[string]}
                onChange={(value) => setStringSubdivision(string, value)}
              />
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- MetronomeControls`
Expected: PASS

Run: `npm run test`
Expected: PASS (full suite)

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/metronome/MetronomeControls.tsx src/components/metronome/MetronomeControls.test.tsx
git commit -m "feat(controls): add por-nota/por-corda rhythm mode toggle with per-string selectors"
```

---

## Self-Review Notes

- **Spec coverage:** state model (Task 1), audio interface change (Task 2), duration resolution logic (Task 3), hook plumbing (Task 4), and UI (Task 5) all map directly to the spec's Sections 2-5.
- **Type/interface consistency verified:** `RhythmMode`, `subdivisionByString`'s `Record<StringNumber, Subdivision>` shape, and the `{ frequency, duration }` note shape are each defined once (Tasks 1 and 2) and reused verbatim by every later task's Interfaces block. `setStringSubdivision(string, subdivision)`'s parameter order and names match exactly between the store (Task 1), the hook (Task 4), and the component (Task 5).
- **Cross-task sequencing verified:** Task 2 deliberately leaves the full suite red (documented in its own Step 4) because `useNotePlayback.ts` still calls the old signature — this is corrected in Task 3, after which the full suite is green again. This is called out explicitly so an implementer doesn't mistake it for their own mistake.
- **Out of scope confirmed absent from every task:** no change to note-to-note spacing/timing, no persistence of the two new fields, no changes to `src/domain/**` or `fretboard-store.ts` — matching the spec's Section 8.

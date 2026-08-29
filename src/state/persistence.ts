import type { Subdivision } from '../domain/music-theory/rhythm';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';
import { useFretboardStore } from './fretboard-store';
import { useMetronomeStore } from './metronome-store';

export const STORAGE_KEY = 'guitar-teacher:preferences';

export interface PersistedPreferences {
  bpm: number;
  subdivision: Subdivision;
  minFret: number;
  maxFret: number;
}

function isValidPreferences(value: unknown): value is PersistedPreferences {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.bpm === 'number' &&
    Number.isFinite(candidate.bpm) &&
    typeof candidate.minFret === 'number' &&
    Number.isFinite(candidate.minFret) &&
    typeof candidate.maxFret === 'number' &&
    Number.isFinite(candidate.maxFret) &&
    typeof candidate.subdivision === 'string' &&
    candidate.subdivision in SUBDIVISION_DURATIONS
  );
}

export function loadPreferences(): PersistedPreferences | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isValidPreferences(parsed)) return null;
  return parsed;
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
  // Only bpm/subdivision are persisted from the metronome store. Selecting
  // just those fields (via subscribeWithSelector) avoids re-saving on every
  // currentPulse tick, which fires many times per second from the
  // audio-scheduled Tone.Loop callback.
  const unsubscribeMetronome = useMetronomeStore.subscribe(
    (state) => [state.bpm, state.subdivision] as const,
    () => savePreferences(currentPreferences()),
  );
  const unsubscribeFretboard = useFretboardStore.subscribe(() => {
    savePreferences(currentPreferences());
  });
  return () => {
    unsubscribeMetronome();
    unsubscribeFretboard();
  };
}

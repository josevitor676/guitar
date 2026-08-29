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

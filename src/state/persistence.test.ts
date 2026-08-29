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

  it('returns null instead of throwing when localStorage contains malformed JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not valid json');
    expect(() => loadPreferences()).not.toThrow();
    expect(loadPreferences()).toBeNull();
  });

  it('returns null when the stored shape has invalid field types/values', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bpm: 'fast', subdivision: 'quarter', minFret: 1, maxFret: 7 }),
    );
    expect(loadPreferences()).toBeNull();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bpm: 100, subdivision: 'not-a-subdivision', minFret: 1, maxFret: 7 }),
    );
    expect(loadPreferences()).toBeNull();

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ bpm: Infinity, subdivision: 'quarter', minFret: 1, maxFret: 7 }),
    );
    expect(loadPreferences()).toBeNull();
  });

  it('does NOT trigger a save when setCurrentPulse alone changes on the metronome store', () => {
    const stop = initPersistence();
    savePreferences({ bpm: 100, subdivision: 'quarter', minFret: 1, maxFret: 7 });
    useMetronomeStore.getState().setCurrentPulse(3);
    useMetronomeStore.getState().setCurrentPulse(4);
    expect(loadPreferences()).toEqual({ bpm: 100, subdivision: 'quarter', minFret: 1, maxFret: 7 });
    stop();
  });
});

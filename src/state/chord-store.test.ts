import { describe, it, expect, beforeEach } from 'vitest';
import { useChordStore } from './chord-store';
import { SILENT_VOICING } from '../domain/chords/chord-voicing';

describe('useChordStore', () => {
  beforeEach(() => useChordStore.getState().clear());

  it('starts with every string silent', () => {
    expect(useChordStore.getState().voicing).toEqual(SILENT_VOICING);
  });

  it('puts a fret on a string', () => {
    useChordStore.getState().toggleFret(6, 3);
    expect(useChordStore.getState().voicing[6]).toBe(3);
  });

  it('replaces the note on a string rather than adding a second', () => {
    useChordStore.getState().toggleFret(6, 3);
    useChordStore.getState().toggleFret(6, 5);

    expect(useChordStore.getState().voicing[6]).toBe(5);
  });

  it('takes the note off when the same fret is pressed again', () => {
    useChordStore.getState().toggleFret(6, 3);
    useChordStore.getState().toggleFret(6, 3);

    expect(useChordStore.getState().voicing[6]).toBe('muted');
  });

  it('lets a string be set open', () => {
    useChordStore.getState().setString(5, 0);
    expect(useChordStore.getState().voicing[5]).toBe(0);
  });

  it('loads a whole shape at once, replacing what was there', () => {
    useChordStore.getState().toggleFret(1, 7);
    useChordStore.getState().loadVoicing({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });

    expect(useChordStore.getState().voicing).toEqual({ 6: 3, 5: 2, 4: 0, 3: 0, 2: 0, 1: 3 });
  });
});

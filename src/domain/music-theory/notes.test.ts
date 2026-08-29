import { describe, it, expect } from 'vitest';
import { noteNameToMidi, midiToNoteName, midiToFrequency, getNoteAt, getPitchClass } from './notes';
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

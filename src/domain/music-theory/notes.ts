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

export function getPitchClass(noteName: string): string {
  const match = /^([A-G]#?)-?\d+$/.exec(noteName);
  if (!match) {
    throw new Error(`Invalid note name: ${noteName}`);
  }
  return match[1];
}

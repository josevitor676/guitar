import type { Subdivision } from '../domain/music-theory/rhythm';

export interface INoteSampler {
  isLoaded(): boolean;
  playNote(frequencyHz: number, duration: number | string, time?: number, velocity?: number): void;
}

export interface IMetronome {
  start(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setSubdivision(subdivision: Subdivision): void;
  onPulse(callback: (pulseIndex: number) => void): () => void;
}

export interface ISequencePlayer {
  play(
    notes: { frequency: number; duration: string; velocity?: number }[],
    bpm: number,
    spacingSubdivision: Subdivision,
    options?: { silent?: boolean },
  ): void;
  stop(): void;
  onNoteChange(callback: (index: number) => void): () => void;
}

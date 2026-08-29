import * as Tone from 'tone';
import type { ISequencePlayer, INoteSampler } from './audio-engine.types';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

export class ToneSequencePlayer implements ISequencePlayer {
  private sequence: Tone.Sequence | null = null;
  private listeners = new Set<(index: number) => void>();

  constructor(private readonly sampler: INoteSampler) {}

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

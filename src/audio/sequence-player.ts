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

  /**
   * `silent` runs the sequence without sounding it. With the metronome on the
   * student plays the notes themselves on the instrument, and a synthesised
   * guitar underneath the click only muddies the beat.
   */
  play(
    notes: { frequency: number; duration: string }[],
    bpm: number,
    spacingSubdivision: Subdivision,
    options: { silent?: boolean } = {},
  ): void {
    this.stop();
    Tone.Transport.stop();
    Tone.Transport.bpm.value = bpm;
    const spacing = SUBDIVISION_DURATIONS[spacingSubdivision];
    this.sequence = new Tone.Sequence(
      (time, index: number) => {
        const note = notes[index];
        if (!options.silent) this.sampler.playNote(note.frequency, note.duration, time);
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

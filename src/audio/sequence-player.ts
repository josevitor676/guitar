import * as Tone from 'tone';
import type { ISequencePlayer, INoteSampler, IGlideVoice, PlayableNote } from './audio-engine.types';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

export class ToneSequencePlayer implements ISequencePlayer {
  private sequence: Tone.Sequence | null = null;
  private listeners = new Set<(index: number) => void>();
  private readonly sampler: INoteSampler;
  private readonly glideVoice: IGlideVoice;

  constructor(sampler: INoteSampler, glideVoice: IGlideVoice) {
    this.sampler = sampler;
    this.glideVoice = glideVoice;
  }

  /**
   * `silent` runs the sequence without sounding it. With the metronome on the
   * student plays the notes themselves on the instrument, and a synthesised
   * guitar underneath the click only muddies the beat.
   */
  play(
    notes: PlayableNote[],
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
        if (!options.silent) {
          // A glided note travels from the pitch before it and so belongs to
          // the voice that can move, not to the sampler.
          if (note.glide) {
            this.glideVoice.playGlide({
              fromHz: note.glide.fromHz,
              toHz: note.frequency,
              duration: note.duration,
              glideSeconds: note.glide.seconds,
              time,
              velocity: note.velocity,
            });
          } else {
            this.sampler.playNote(note.frequency, note.duration, time, note.velocity);
          }
        }
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

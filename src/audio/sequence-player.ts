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
    options: { silent?: boolean; startAfterSeconds?: number } = {},
  ): void {
    this.stop();
    Tone.Transport.stop();
    Tone.Transport.bpm.value = bpm;
    const spacing = SUBDIVISION_DURATIONS[spacingSubdivision];
    this.sequence = new Tone.Sequence(
      (time, index: number) => {
        const note = notes[index];
        if (!options.silent) {
          // The note a glide departs from carries the whole gesture, and the
          // note it arrives at makes no sound of its own — one string, picked
          // once, whose pitch moves.
          if (note.glide) {
            this.glideVoice.playGlide({
              fromHz: note.frequency,
              toHz: note.glide.toHz,
              startsAfterSeconds: note.glide.startsAfterSeconds,
              glideSeconds: note.glide.glideSeconds,
              holdSeconds: note.glide.holdSeconds,
              time,
              velocity: note.velocity,
            });
          } else if (note.arrivesByGlide) {
            // Already sounding, carried by the note before it.
          } else if (note.slurred) {
            this.sampler.playSlurred(note.frequency, note.duration, time, note.velocity);
          } else {
            this.sampler.playNote(note.frequency, note.duration, time, note.velocity);
          }
        }
        this.listeners.forEach((listener) => listener(index));
      },
      notes.map((_, index) => index),
      spacing,
    // The count-in delays the whole sequence once. Padding the pattern with
    // rests instead would put them inside the loop, so every repeat would pause
    // for the length of the count before coming round again.
    ).start(options.startAfterSeconds ?? 0);
    Tone.Transport.start();
  }

  setBpm(bpm: number): void {
    // The Sequence follows the transport, so retuning the transport changes
    // the speed of the notes already scheduled without touching the loop.
    Tone.Transport.bpm.value = bpm;
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

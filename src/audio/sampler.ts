import * as Tone from 'tone';
import type { INoteSampler } from './audio-engine.types';

import { SAMPLE_BASE_URL as BASE_URL, SAMPLE_URLS } from './guitar-samples';

/**
 * How long a slurred note takes to reach full volume.
 *
 * A hammered or pulled note is never picked, and the pick is the sharp
 * transient at the front of the recording. It cannot be removed from a sample,
 * but fading the sample in over a few milliseconds swallows it, which is what
 * makes the technique audible rather than merely quieter.
 */
const SLUR_ATTACK_SECONDS = 0.035;

export class ToneNoteSampler implements INoteSampler {
  private sampler: Tone.Sampler;
  private slurSampler: Tone.Sampler;
  private loaded = false;

  constructor() {
    this.sampler = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: BASE_URL,
      onload: () => {
        this.loaded = true;
      },
    }).toDestination();

    // A second voice over the same recordings, opened softly. Tone's attack is
    // a property of the sampler, not of a note, so a slurred note needs its own.
    this.slurSampler = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: BASE_URL,
      attack: SLUR_ATTACK_SECONDS,
      release: 0.4,
      volume: -4,
    }).toDestination();
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * `time` is the transport time the note was scheduled for. Passing it through
   * is what keeps a sequence in step with the metronome: without it the note
   * sounds at whatever moment the callback happens to run, while the click
   * sounds at the scheduled beat, and the two drift audibly apart.
   */
  playNote(frequencyHz: number, duration: number | string, time?: number, velocity?: number): void {
    if (!this.loaded) return;
    this.sampler.triggerAttackRelease(frequencyHz, duration, time, velocity);
  }

  /** Sounds a note that was reached without picking it. */
  playSlurred(frequencyHz: number, duration: number | string, time?: number, velocity?: number): void {
    if (!this.loaded) return;
    this.slurSampler.triggerAttackRelease(frequencyHz, duration, time, velocity);
  }
}

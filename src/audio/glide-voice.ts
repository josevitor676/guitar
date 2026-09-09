import * as Tone from 'tone';
import type { GlideRequest, IGlideVoice } from './audio-engine.types';

/**
 * A plucked-sounding synth whose pitch travels during the note.
 *
 * Slides and bends cannot be played by the sampler — Tone's Sampler has no
 * frequency or detune parameter, so a sampled note is fixed at the pitch it was
 * struck at. A MonoSynth's frequency is a signal and can be ramped, at the cost
 * of not being the recorded guitar. The envelope is shaped short and bright so
 * it sits as close to a plucked string as a synth gets.
 */
export class ToneGlideVoice implements IGlideVoice {
  private synth: Tone.MonoSynth;

  constructor() {
    this.synth = new Tone.MonoSynth({
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.35, sustain: 0.25, release: 0.4 },
      filter: { type: 'lowpass', rolloff: -12 },
      filterEnvelope: { attack: 0.005, decay: 0.2, sustain: 0.2, release: 0.3, baseFrequency: 320, octaves: 3 },
      volume: -10,
    }).toDestination();
  }

  playGlide({ fromHz, toHz, duration, glideSeconds, time, velocity }: GlideRequest): void {
    // Start where the previous note left off, then travel to the target. The
    // note is not struck again at the target: the pitch simply arrives there,
    // which is what a slide and a bend do.
    this.synth.frequency.setValueAtTime(fromHz, time ?? Tone.now());
    this.synth.triggerAttackRelease(fromHz, duration, time, velocity);

    if (glideSeconds > 0) {
      this.synth.frequency.exponentialRampTo(toHz, glideSeconds, time);
    } else {
      this.synth.frequency.setValueAtTime(toHz, time ?? Tone.now());
    }
  }
}

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
      // A triangle is close to a plucked string's spectrum; the sawtooth this
      // started as read as a synth buzz next to the sampled guitar.
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.004, decay: 0.9, sustain: 0.08, release: 0.6 },
      filter: { type: 'lowpass', rolloff: -24, Q: 0.6 },
      // The filter closes as the note decays, which is what makes a plucked
      // string go dull as it dies away instead of staying bright.
      filterEnvelope: {
        attack: 0.003,
        decay: 0.5,
        sustain: 0.05,
        release: 0.5,
        baseFrequency: 260,
        octaves: 3.2,
      },
      volume: -12,
    }).toDestination();
  }

  playGlide({ fromHz, toHz, duration, glideSeconds, time, velocity }: GlideRequest): void {
    // Start where the previous note left off, then travel to the target. The
    // note is not struck again at the target: the pitch simply arrives there,
    // which is what a slide and a bend do.
    this.synth.frequency.setValueAtTime(fromHz, time ?? Tone.now());
    this.synth.triggerAttackRelease(fromHz, duration, time, velocity);

    if (glideSeconds > 0) {
      // Exponential in frequency is linear in pitch, which is how a hand moving
      // at a steady speed actually sounds.
      this.synth.frequency.exponentialRampTo(toHz, glideSeconds, time);
    } else {
      this.synth.frequency.setValueAtTime(toHz, time ?? Tone.now());
    }
  }
}

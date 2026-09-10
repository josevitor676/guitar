import * as Tone from 'tone';
import type { GlideRequest, IGlideVoice } from './audio-engine.types';
import { SAMPLE_BASE_URL, SAMPLE_URLS, nearestSample } from './guitar-samples';

/** Long enough to close the note without a click, short enough not to blur it. */
const FADE_OUT_SECONDS = 0.12;

/**
 * Slides and bends played on the recorded guitar.
 *
 * Tone's Sampler cannot do this — it exposes no frequency or detune parameter,
 * so a sampled note is stuck at the pitch it was struck at. But `playbackRate`
 * on a raw buffer source *is* a Param, so it can be ramped, and speeding a
 * recording up or slowing it down is exactly what a vibrating string does when
 * a finger slides or bends it. This is closer to the instrument than any synth
 * could be: the same recording, moving.
 */
export class ToneGlideVoice implements IGlideVoice {
  private buffers: Tone.ToneAudioBuffers;

  constructor() {
    this.buffers = new Tone.ToneAudioBuffers({
      urls: SAMPLE_URLS,
      baseUrl: SAMPLE_BASE_URL,
    });
  }

  playGlide({
    fromHz,
    toHz,
    startsAfterSeconds,
    glideSeconds,
    holdSeconds,
    time,
    velocity = 1,
  }: GlideRequest): void {
    const { note, rootHz } = nearestSample(fromHz);
    if (!this.buffers.has(note) || !this.buffers.loaded) return;

    const start = time ?? Tone.now();
    const gain = new Tone.Gain(velocity).toDestination();
    const source = new Tone.ToneBufferSource({
      url: this.buffers.get(note),
      fadeOut: FADE_OUT_SECONDS,
    }).connect(gain);

    // Playing the recording faster raises its pitch; ramping that speed is the
    // glide. The rate is relative to the pitch the recording was played at.
    source.playbackRate.setValueAtTime(fromHz / rootHz, start);
    if (glideSeconds > 0) {
      source.playbackRate.exponentialRampTo(toHz / rootHz, glideSeconds, start + startsAfterSeconds);
    } else {
      source.playbackRate.setValueAtTime(toHz / rootHz, start + startsAfterSeconds);
    }

    source.start(start);
    source.stop(start + holdSeconds);
    source.onended = () => {
      source.dispose();
      gain.dispose();
    };
  }
}

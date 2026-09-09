import * as Tone from 'tone';
import type { IMetronome } from './audio-engine.types';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

/** Beats per bar, which is what decides where the accented click falls. */
const PULSES_PER_BAR = 4;
const ACCENT_PITCH = 'C7';
const CLICK_PITCH = 'C6';
/** Short enough to read as a click rather than a tone. */
const CLICK_LENGTH = 0.02;

export class ToneMetronome implements IMetronome {
  private click: Tone.Synth;
  private loop: Tone.Loop | null = null;
  private subdivision: Subdivision = 'quarter';
  private pulseIndex = 0;
  private listeners = new Set<(pulseIndex: number) => void>();

  constructor() {
    // A MembraneSynth is a kick drum: a low boom with a pitch sweep, which is
    // what made the old metronome sound wrong. A plain sine with an almost
    // instant envelope is the short, high tick a metronome is expected to make.
    this.click = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.012 },
      volume: -6,
    }).toDestination();
  }

  start(): void {
    this.loop?.dispose();
    this.pulseIndex = 0;
    this.loop = new Tone.Loop((time) => {
      const isDownbeat = this.pulseIndex % PULSES_PER_BAR === 0;
      this.click.triggerAttackRelease(
        isDownbeat ? ACCENT_PITCH : CLICK_PITCH,
        CLICK_LENGTH,
        time,
      );

      const pulse = this.pulseIndex;
      // The click is scheduled ahead of the audio clock, so the UI pulse is
      // handed to Tone.Draw to land when the sound actually reaches the ear.
      Tone.Draw.schedule(() => {
        this.listeners.forEach((listener) => listener(pulse));
      }, time);

      this.pulseIndex += 1;
    }, SUBDIVISION_DURATIONS[this.subdivision]).start(0);
    Tone.Transport.start();
  }

  stop(): void {
    // Only stop this metronome's own loop. Tone.Transport is shared with
    // sequence playback, which must keep running independently of the
    // metronome (see spec Global Constraints).
    this.loop?.stop();
  }

  setBpm(bpm: number): void {
    Tone.Transport.bpm.value = bpm;
  }

  setSubdivision(subdivision: Subdivision): void {
    this.subdivision = subdivision;
    if (this.loop) {
      this.loop.interval = SUBDIVISION_DURATIONS[subdivision];
    }
  }

  onPulse(callback: (pulseIndex: number) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

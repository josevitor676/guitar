import * as Tone from 'tone';
import type { IMetronome } from './audio-engine.types';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';

export class ToneMetronome implements IMetronome {
  private click: Tone.MembraneSynth;
  private loop: Tone.Loop | null = null;
  private subdivision: Subdivision = 'quarter';
  private pulseIndex = 0;
  private listeners = new Set<(pulseIndex: number) => void>();

  constructor() {
    this.click = new Tone.MembraneSynth().toDestination();
  }

  start(): void {
    this.loop?.dispose();
    this.pulseIndex = 0;
    this.loop = new Tone.Loop((time) => {
      this.click.triggerAttackRelease('C2', '16n', time);
      this.listeners.forEach((listener) => listener(this.pulseIndex));
      this.pulseIndex += 1;
    }, SUBDIVISION_DURATIONS[this.subdivision]).start(0);
    Tone.Transport.start();
  }

  stop(): void {
    this.loop?.stop();
    Tone.Transport.stop();
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

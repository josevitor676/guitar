import * as Tone from 'tone';
import type { INoteSampler } from './audio-engine.types';

const BASE_URL = 'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/';

const SAMPLE_URLS: Record<string, string> = {
  E2: 'E2.mp3',
  A2: 'A2.mp3',
  D3: 'D3.mp3',
  G3: 'G3.mp3',
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
};

export class ToneNoteSampler implements INoteSampler {
  private sampler: Tone.Sampler;
  private loaded = false;

  constructor() {
    this.sampler = new Tone.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: BASE_URL,
      onload: () => {
        this.loaded = true;
      },
    }).toDestination();
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  playNote(frequencyHz: number, duration: number | string): void {
    if (!this.loaded) return;
    this.sampler.triggerAttackRelease(frequencyHz, duration);
  }
}

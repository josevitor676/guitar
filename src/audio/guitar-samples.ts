import * as Tone from 'tone';

export const SAMPLE_BASE_URL =
  'https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/';

/** The recorded notes, by the pitch each one was played at. */
export const SAMPLE_URLS: Record<string, string> = {
  E2: 'E2.mp3',
  A2: 'A2.mp3',
  D3: 'D3.mp3',
  G3: 'G3.mp3',
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  A4: 'A4.mp3',
  C5: 'C5.mp3',
};

export const SAMPLE_NOTES = Object.keys(SAMPLE_URLS);

/**
 * The recording closest in pitch to a frequency, with its own pitch.
 *
 * A glide is made by speeding up or slowing down a recording, and a recording
 * pushed far from the pitch it was played at starts to sound wrong — sped up it
 * turns thin and chipmunky. Starting from the nearest sample keeps that shift
 * small.
 */
export function nearestSample(frequencyHz: number): { note: string; rootHz: number } {
  let nearest = SAMPLE_NOTES[0];
  let nearestRatio = Infinity;

  for (const note of SAMPLE_NOTES) {
    const rootHz = Tone.Frequency(note).toFrequency();
    // Compared in ratio, not in hertz: pitch is heard logarithmically, so a
    // 20 Hz gap is huge down low and negligible up high.
    const ratio = Math.abs(Math.log2(frequencyHz / rootHz));
    if (ratio < nearestRatio) {
      nearestRatio = ratio;
      nearest = note;
    }
  }

  return { note: nearest, rootHz: Tone.Frequency(nearest).toFrequency() };
}

import * as Tone from 'tone';

let started = false;

export async function ensureAudioStarted(): Promise<void> {
  if (started) return;
  await Tone.start();
  started = true;
}

import type { INoteSampler, IMetronome, ISequencePlayer } from './audio-engine.types';
import { ToneNoteSampler } from './sampler';
import { ToneMetronome } from './metronome';
import { ToneSequencePlayer } from './sequence-player';

export { ensureAudioStarted } from './audio-context';
export type { INoteSampler, IMetronome, ISequencePlayer } from './audio-engine.types';

export const sampler: INoteSampler = new ToneNoteSampler();
export const metronome: IMetronome = new ToneMetronome();
export const sequencePlayer: ISequencePlayer = new ToneSequencePlayer(sampler);

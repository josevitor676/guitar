import type { Subdivision } from '../domain/music-theory/rhythm';

export interface INoteSampler {
  isLoaded(): boolean;
  playNote(frequencyHz: number, duration: number | string, time?: number, velocity?: number): void;
  /** Sounds a note reached by hammering or pulling, with the pick attack softened away. */
  playSlurred(frequencyHz: number, duration: number | string, time?: number, velocity?: number): void;
}

export interface GlideRequest {
  fromHz: number;
  toHz: number;
  duration: number | string;
  glideSeconds: number;
  time?: number;
  velocity?: number;
}

/**
 * A voice whose pitch can move while the note sounds.
 *
 * The guitar sampler cannot do this: Tone's Sampler exposes no detune or
 * frequency parameter, so a sampled note is stuck at the pitch it was struck
 * at. Slides and bends therefore sound on a synthesised voice, which is a real
 * trade in timbre for the only way to make the pitch actually travel.
 */
export interface IGlideVoice {
  playGlide(request: GlideRequest): void;
}

export interface IMetronome {
  start(): void;
  stop(): void;
  setBpm(bpm: number): void;
  setSubdivision(subdivision: Subdivision): void;
  onPulse(callback: (pulseIndex: number) => void): () => void;
}

export interface PlayableNote {
  frequency: number;
  duration: string;
  velocity?: number;
  /** Present when the note is reached by gliding from the pitch before it. */
  glide?: { fromHz: number; seconds: number };
  /** True when the note is reached without picking it. */
  slurred?: boolean;
}

export interface ISequencePlayer {
  play(
    notes: PlayableNote[],
    bpm: number,
    spacingSubdivision: Subdivision,
    options?: { silent?: boolean; startOffsetSteps?: number },
  ): void;
  stop(): void;
  onNoteChange(callback: (index: number) => void): () => void;
}

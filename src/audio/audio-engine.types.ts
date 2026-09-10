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
  /** When the pitch starts moving, measured from the note's own start. */
  startsAfterSeconds: number;
  /** How long the pitch takes to travel. */
  glideSeconds: number;
  /** How long the whole gesture sounds, covering both notated notes. */
  holdSeconds: number;
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
 *
 * The whole gesture is one call, made when the *first* of the two notes sounds.
 * A slide is one note that moves, not two notes: attacking the target
 * separately would sound the starting pitch twice, in two timbres at once.
 */
export interface IGlideVoice {
  playGlide(request: GlideRequest): void;
}

export interface IMetronome {
  /** `atSeconds` is a transport time, so the click can be held back for a count-in. */
  start(atSeconds?: number): void;
  stop(): void;
  setBpm(bpm: number): void;
  setSubdivision(subdivision: Subdivision): void;
  onPulse(callback: (pulseIndex: number) => void): () => void;
}

export interface PlayableNote {
  frequency: number;
  duration: string;
  velocity?: number;
  /** Set on the note a glide *departs* from; it carries the whole gesture. */
  glide?: { toHz: number; startsAfterSeconds: number; glideSeconds: number; holdSeconds: number };
  /** True for the note a glide arrives at: it makes no sound of its own. */
  arrivesByGlide?: boolean;
  /** True when the note is reached without picking it. */
  slurred?: boolean;
}

export interface ISequencePlayer {
  play(
    notes: PlayableNote[],
    bpm: number,
    spacingSubdivision: Subdivision,
    options?: { silent?: boolean; startAfterSeconds?: number },
  ): void;
  stop(): void;
  /** Retunes the running sequence. The speed trainer raises the tempo between
   *  loops, and restarting the sequence to do it would cut the loop short. */
  setBpm(bpm: number): void;
  onNoteChange(callback: (index: number) => void): () => void;
}

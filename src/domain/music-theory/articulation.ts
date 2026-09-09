/** How a note is reached from the one before it in a sequence. */
export type Articulation = 'hammerOn' | 'pullOff' | 'slide' | 'bend';

/** The articulations that reach their note by gliding the pitch, not by striking it. */
export const GLIDING_ARTICULATIONS: ReadonlySet<Articulation> = new Set(['slide', 'bend']);

export function isGliding(articulation: Articulation): boolean {
  return GLIDING_ARTICULATIONS.has(articulation);
}

/**
 * The same slur played in the other direction.
 *
 * Going from the third fret to the fifth is a hammer-on; coming back from the
 * fifth to the third is a pull-off. Reversing a sequence therefore has to swap
 * them, or the exercise would ask for a technique the hand cannot perform.
 */
export function invertArticulation(articulation: Articulation): Articulation {
  if (articulation === 'hammerOn') return 'pullOff';
  if (articulation === 'pullOff') return 'hammerOn';
  // A slide and a bend take their direction from the pitches they join, so
  // played backwards they are still a slide and still a bend.
  return articulation;
}

export const ARTICULATION_SHORT_LABEL: Record<Articulation, string> = {
  hammerOn: 'h',
  pullOff: 'p',
  slide: 'sl',
  bend: 'b',
};

export const ARTICULATION_LABEL: Record<Articulation, string> = {
  hammerOn: 'hammer-on',
  pullOff: 'pull-off',
  slide: 'slide',
  bend: 'bend',
};

/**
 * How long the pitch takes to travel, as a share of the note it lands on.
 *
 * A slide is a fast movement of the hand and arrives almost at once; a bend is
 * expressive and takes most of the note to reach its target. Anything that is
 * not a glide arrives instantly.
 */
export function glideSecondsFor(articulation: Articulation, noteSeconds: number): number {
  if (articulation === 'slide') return Math.min(0.09, noteSeconds * 0.35);
  if (articulation === 'bend') return noteSeconds * 0.55;
  return 0;
}

/**
 * How hard a note is struck, from 0 to 1.
 *
 * A sampler cannot suppress the attack baked into its recording, so a slurred
 * note is approximated by sounding it softer than the picked note before it.
 * That is the dynamic shape the technique produces, not true legato, which
 * would need a voice that sustains and changes pitch.
 */
export const PLUCKED_VELOCITY = 1;
export const SLURRED_VELOCITY = 0.45;

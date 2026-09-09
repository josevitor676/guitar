/** How a note is reached from the one before it in a sequence. */
export type Articulation = 'hammerOn' | 'pullOff';

/**
 * The same slur played in the other direction.
 *
 * Going from the third fret to the fifth is a hammer-on; coming back from the
 * fifth to the third is a pull-off. Reversing a sequence therefore has to swap
 * them, or the exercise would ask for a technique the hand cannot perform.
 */
export function invertArticulation(articulation: Articulation): Articulation {
  return articulation === 'hammerOn' ? 'pullOff' : 'hammerOn';
}

export const ARTICULATION_SHORT_LABEL: Record<Articulation, string> = {
  hammerOn: 'h',
  pullOff: 'p',
};

export const ARTICULATION_LABEL: Record<Articulation, string> = {
  hammerOn: 'hammer-on',
  pullOff: 'pull-off',
};

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

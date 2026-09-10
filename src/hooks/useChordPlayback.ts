import { useCallback } from 'react';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import { ALL_STRINGS, isSounding } from '../domain/chords/chord-voicing';
import type { ChordVoicing } from '../domain/chords/chord-voicing';
import { sampler, ensureAudioStarted } from '../audio';

/** How far apart the strings are struck. A strum is not a stab. */
const STRUM_GAP_SECONDS = 0.04;

export function useChordPlayback() {
  const strum = useCallback(async (voicing: ChordVoicing) => {
    await ensureAudioStarted();

    // Low string first, as the hand crosses them.
    ALL_STRINGS.filter((string) => isSounding(voicing[string])).forEach((string, index) => {
      const note = getNoteAt(STANDARD_TUNING, { string, fret: voicing[string] as number });
      window.setTimeout(() => sampler.playNote(note.frequency, '2n'), index * STRUM_GAP_SECONDS * 1000);
    });
  }, []);

  return { strum };
}

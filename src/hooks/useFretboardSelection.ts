import { useCallback } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import type { FretPosition } from '../domain/music-theory/tuning';
import { sampler, ensureAudioStarted } from '../audio';

export function useFretboardSelection() {
  const minFret = useFretboardStore((state) => state.minFret);
  const maxFret = useFretboardStore((state) => state.maxFret);
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const setFretRange = useFretboardStore((state) => state.setFretRange);
  const toggleNoteInStore = useFretboardStore((state) => state.toggleNote);
  const loadSequence = useFretboardStore((state) => state.loadSequence);
  const appendNoteToStore = useFretboardStore((state) => state.appendNote);

  const toggleNote = useCallback(
    async (position: FretPosition) => {
      await ensureAudioStarted();
      const note = getNoteAt(STANDARD_TUNING, position);
      sampler.playNote(note.frequency, 0.5);
      toggleNoteInStore(position);
    },
    [toggleNoteInStore],
  );

  const appendNote = useCallback(
    async (position: FretPosition) => {
      await ensureAudioStarted();
      const note = getNoteAt(STANDARD_TUNING, position);
      sampler.playNote(note.frequency, 0.5);
      appendNoteToStore(position);
    },
    [appendNoteToStore],
  );

  return { minFret, maxFret, selectedNotes, setFretRange, toggleNote, appendNote, loadSequence };
}

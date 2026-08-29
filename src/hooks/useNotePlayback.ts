import { useCallback, useEffect, useState } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { useMetronomeStore } from '../state/metronome-store';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import { sequencePlayer, ensureAudioStarted } from '../audio';

export function useNotePlayback() {
  const selectedNotes = useFretboardStore((state) => state.selectedNotes);
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => sequencePlayer.onNoteChange(setCurrentIndex), []);

  const play = useCallback(async () => {
    await ensureAudioStarted();
    const notes = selectedNotes.map((position) => getNoteAt(STANDARD_TUNING, position));
    sequencePlayer.play(notes, bpm, subdivision);
    setIsPlaying(true);
  }, [selectedNotes, bpm, subdivision]);

  const stop = useCallback(() => {
    sequencePlayer.stop();
    setIsPlaying(false);
    setCurrentIndex(null);
  }, []);

  return { play, stop, isPlaying, currentIndex };
}

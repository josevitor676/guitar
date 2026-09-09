import { useCallback, useEffect } from 'react';
import { useMetronomeStore } from '../state/metronome-store';
import { usePlaybackSequence } from './usePlaybackSequence';
import { usePlaybackStore } from '../state/playback-store';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import { SUBDIVISION_DURATIONS } from '../domain/music-theory/rhythm';
import { sequencePlayer, ensureAudioStarted } from '../audio';

export function useNotePlayback() {
  const sequence = usePlaybackSequence();
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const metronomeOn = useMetronomeStore((state) => state.isPlaying);
  const currentIndex = usePlaybackStore((state) => state.currentIndex);
  const isPlaying = usePlaybackStore((state) => state.isPlaying);
  const setCurrentIndex = usePlaybackStore((state) => state.setCurrentIndex);
  const setIsPlaying = usePlaybackStore((state) => state.setIsPlaying);

  useEffect(() => sequencePlayer.onNoteChange(setCurrentIndex), [setCurrentIndex]);

  const play = useCallback(async () => {
    setCurrentIndex(null);
    await ensureAudioStarted();
    const notes = sequence.map((position) => {
      const note = getNoteAt(STANDARD_TUNING, position);
      return { frequency: note.frequency, duration: SUBDIVISION_DURATIONS[subdivision] };
    });
    // With the metronome leading, the notes stay silent so the click is clear.
    sequencePlayer.play(notes, bpm, subdivision, { silent: metronomeOn });
    setIsPlaying(true);
  }, [sequence, bpm, subdivision, metronomeOn, setIsPlaying, setCurrentIndex]);

  const stop = useCallback(() => {
    sequencePlayer.stop();
    setIsPlaying(false);
    setCurrentIndex(null);
  }, [setIsPlaying, setCurrentIndex]);

  return { play, stop, isPlaying, currentIndex };
}

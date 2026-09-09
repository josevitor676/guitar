import { useCallback, useEffect } from 'react';
import { useMetronomeStore } from '../state/metronome-store';
import { usePlaybackSequence } from './usePlaybackSequence';
import { usePlaybackStore } from '../state/playback-store';
import { STANDARD_TUNING } from '../domain/music-theory/tuning';
import { getNoteAt } from '../domain/music-theory/notes';
import { SUBDIVISION_DURATIONS, SUBDIVISION_BEATS } from '../domain/music-theory/rhythm';
import {
  SLURRED_VELOCITY,
  PLUCKED_VELOCITY,
  isGliding,
  glideSecondsFor,
} from '../domain/music-theory/articulation';
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
    const secondsPerNote = SUBDIVISION_BEATS[subdivision] * (60 / bpm);

    const notes = sequence.map((position, index) => {
      const note = getNoteAt(STANDARD_TUNING, position);
      const previous = sequence[index - 1];
      const glides = !!position.articulation && isGliding(position.articulation) && !!previous;
      // A hammered or pulled note is not picked: it sounds because the finger
      // strikes or plucks a string that is already ringing, so it comes out
      // weaker than the note before it.
      return {
        frequency: note.frequency,
        duration: SUBDIVISION_DURATIONS[subdivision],
        velocity: position.articulation ? SLURRED_VELOCITY : PLUCKED_VELOCITY,
        // A slide or a bend starts at the pitch before it and travels; the
        // player hands those to the voice that can move.
        glide: glides
          ? {
              fromHz: getNoteAt(STANDARD_TUNING, previous).frequency,
              seconds: glideSecondsFor(position.articulation!, secondsPerNote),
            }
          : undefined,
      };
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

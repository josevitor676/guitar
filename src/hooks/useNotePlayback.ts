import { useCallback, useEffect } from 'react';
import { useMetronomeStore } from '../state/metronome-store';
import { usePlaybackSequence } from './usePlaybackSequence';
import { countInSeconds } from '../domain/playback/count-in';
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
import { sequencePlayer, metronome, ensureAudioStarted } from '../audio';

export function useNotePlayback() {
  const sequence = usePlaybackSequence();
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const metronomeArmed = useMetronomeStore((state) => state.enabled);
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
      const next = sequence[index + 1];
      // A glide is one picked note whose pitch travels, so the gesture is
      // described on the note it departs from, not on the one it reaches.
      const departsInto =
        next?.articulation && isGliding(next.articulation) ? next.articulation : undefined;
      const arrivesByGlide =
        !!position.articulation && isGliding(position.articulation) && index > 0;
      // A hammered or pulled note is not picked: it sounds because the finger
      // strikes or plucks a string that is already ringing, so it comes out
      // weaker than the note before it.
      return {
        frequency: note.frequency,
        duration: SUBDIVISION_DURATIONS[subdivision],
        velocity: position.articulation ? SLURRED_VELOCITY : PLUCKED_VELOCITY,
        // A slide or a bend starts at the pitch before it and travels; the
        // player hands those to the voice that can move.
        slurred: !!position.articulation && !arrivesByGlide,
        arrivesByGlide,
        glide: departsInto
          ? {
              toHz: getNoteAt(STANDARD_TUNING, next).frequency,
              // The pitch starts moving when the second note is written to sound.
              startsAfterSeconds: secondsPerNote,
              glideSeconds: glideSecondsFor(departsInto, secondsPerNote),
              holdSeconds: secondsPerNote * 2,
            }
          : undefined,
      };
    });
    // With the metronome leading, the notes stay silent so the click is clear.
    const countIn = countInSeconds(bpm);

    sequencePlayer.play(notes, bpm, subdivision, {
      silent: metronomeArmed,
      startAfterSeconds: countIn,
    });

    // The click belongs to playback: arming it only marks the beats on screen,
    // and it starts sounding when the sequence does.
    if (metronomeArmed) {
      metronome.setBpm(bpm);
      metronome.setSubdivision(subdivision);
      // Held back with the sequence: the click belongs to the exercise, and
      // starting it under the count would put it out of step with the first note.
      metronome.start(countIn);
      useMetronomeStore.setState({ isPlaying: true });
    }

    setIsPlaying(true);
  }, [sequence, bpm, subdivision, metronomeArmed, setIsPlaying, setCurrentIndex]);

  const stop = useCallback(() => {
    sequencePlayer.stop();
    metronome.stop();
    useMetronomeStore.setState({ isPlaying: false, currentPulse: 0 });
    setIsPlaying(false);
    setCurrentIndex(null);
  }, [setIsPlaying, setCurrentIndex]);

  return { play, stop, isPlaying, currentIndex };
}

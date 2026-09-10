import { useCallback, useEffect } from 'react';
import { useMetronomeStore } from '../state/metronome-store';
import type { Subdivision } from '../domain/music-theory/rhythm';
import { metronome, ensureAudioStarted } from '../audio';

export function useMetronome() {
  const bpm = useMetronomeStore((state) => state.bpm);
  const subdivision = useMetronomeStore((state) => state.subdivision);
  const enabled = useMetronomeStore((state) => state.enabled);
  const isPlaying = useMetronomeStore((state) => state.isPlaying);
  const setEnabled = useMetronomeStore((state) => state.setEnabled);
  const currentPulse = useMetronomeStore((state) => state.currentPulse);
  const setBpmInStore = useMetronomeStore((state) => state.setBpm);
  const setSubdivisionInStore = useMetronomeStore((state) => state.setSubdivision);
  const startInStore = useMetronomeStore((state) => state.start);
  const stopInStore = useMetronomeStore((state) => state.stop);
  const setCurrentPulse = useMetronomeStore((state) => state.setCurrentPulse);

  useEffect(() => metronome.onPulse(setCurrentPulse), [setCurrentPulse]);

  const start = useCallback(async () => {
    await ensureAudioStarted();
    metronome.setBpm(bpm);
    metronome.setSubdivision(subdivision);
    metronome.start();
    startInStore();
  }, [bpm, subdivision, startInStore]);

  const stop = useCallback(() => {
    metronome.stop();
    stopInStore();
  }, [stopInStore]);

  const setBpm = useCallback(
    (newBpm: number) => {
      setBpmInStore(newBpm);
      metronome.setBpm(newBpm);
    },
    [setBpmInStore],
  );

  const setSubdivision = useCallback(
    (newSubdivision: Subdivision) => {
      setSubdivisionInStore(newSubdivision);
      metronome.setSubdivision(newSubdivision);
    },
    [setSubdivisionInStore],
  );

  return {
    bpm,
    subdivision,
    enabled,
    isPlaying,
    currentPulse,
    setEnabled,
    start,
    stop,
    setBpm,
    setSubdivision,
  };
}

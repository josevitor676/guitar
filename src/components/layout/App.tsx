import { useEffect } from 'react';
import { Fretboard } from '../fretboard/Fretboard';
import { FretRangeControl } from '../fretboard/FretRangeControl';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { PulseIndicator } from '../metronome/PulseIndicator';
import { PlayButton } from '../player/PlayButton';
import { ExerciseList } from '../exercises/ExerciseList';
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';

export function App() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse } = useMetronome();

  useEffect(() => {
    const preferences = loadPreferences();
    if (preferences) {
      useFretboardStore.getState().setFretRange(preferences.minFret, preferences.maxFret);
      useMetronomeStore.getState().setBpm(preferences.bpm);
      useMetronomeStore.getState().setSubdivision(preferences.subdivision);
    }
    return initPersistence();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <h1 className="mb-6 text-2xl font-bold">Guitar Teacher</h1>

      <div className="mb-4 flex items-center gap-4">
        <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
        <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
      </div>

      <Fretboard currentIndex={currentIndex} />

      <div className="mt-6 flex items-center gap-6">
        <PlayButton />
        <MetronomeControls />
      </div>

      <div className="mt-8">
        <h2 className="mb-2 text-lg font-semibold">Exercícios</h2>
        <ExerciseList />
      </div>
    </div>
  );
}

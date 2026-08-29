import { useEffect } from 'react';
import { Theme } from '@astryxdesign/core/theme';
import { gothicTheme } from '@astryxdesign/theme-gothic/built';
import { Fretboard } from '../fretboard/Fretboard';
import { FretRangeControl } from '../fretboard/FretRangeControl';
import { MetronomeControls } from '../metronome/MetronomeControls';
import { PulseIndicator } from '../metronome/PulseIndicator';
import { PlayButton } from '../player/PlayButton';
import { ExerciseList } from '../exercises/ExerciseList';
import { Tabs } from './Tabs';
import { useFretboardSelection } from '../../hooks/useFretboardSelection';
import { useNotePlayback } from '../../hooks/useNotePlayback';
import { useMetronome } from '../../hooks/useMetronome';
import { useSamplerLoaded } from '../../hooks/useSamplerLoaded';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';
import type { TabId } from '../../state/ui-store';

const TABS: { id: TabId; label: string }[] = [
  { id: 'practice', label: 'Prática / Fretboard Livre' },
  { id: 'exercises', label: 'Exercícios' },
];

export function App() {
  const { minFret, maxFret, setFretRange } = useFretboardSelection();
  const { currentIndex } = useNotePlayback();
  const { isPlaying, currentPulse } = useMetronome();
  const samplerLoaded = useSamplerLoaded();
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);

  useEffect(() => {
    const preferences = loadPreferences();
    if (preferences) {
      useFretboardStore.getState().setFretRange(Math.max(1, preferences.minFret), preferences.maxFret);
      useMetronomeStore.getState().setBpm(preferences.bpm);
      useMetronomeStore.getState().setSubdivision(preferences.subdivision);
    }
    return initPersistence();
  }, []);

  return (
    <Theme theme={gothicTheme} mode="dark">
      <div className="min-h-screen bg-zinc-950 p-6 font-medium tracking-wide text-zinc-100">
        <h1 className="mb-6 text-2xl font-bold tracking-wide">Guitar Teacher</h1>

        {!samplerLoaded && (
          <p className="mb-4 text-sm text-amber-400" role="status">
            Carregando sons...
          </p>
        )}

        <Tabs tabs={TABS} activeTabId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

        {activeTab === 'practice' && (
          <div className="mt-6">
            <div className="mb-4 flex items-center gap-4">
              <FretRangeControl minFret={minFret} maxFret={maxFret} onChange={setFretRange} />
              <PulseIndicator currentPulse={currentPulse} isPlaying={isPlaying} />
            </div>

            <Fretboard currentIndex={currentIndex} />

            <div className="mt-6 flex items-center gap-6">
              <PlayButton />
              <MetronomeControls />
            </div>
          </div>
        )}

        {activeTab === 'exercises' && (
          <div className="mt-6 flex flex-col gap-6 lg:flex-row">
            <div className="lg:w-64">
              <h2 className="mb-2 text-lg font-semibold tracking-wide">Exercícios</h2>
              <ExerciseList />
            </div>

            <div>
              <Fretboard currentIndex={currentIndex} />
              <div className="mt-6 flex items-center gap-6">
                <PlayButton />
                <MetronomeControls />
              </div>
            </div>
          </div>
        )}
      </div>
    </Theme>
  );
}

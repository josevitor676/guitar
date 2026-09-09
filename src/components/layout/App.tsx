import { useEffect } from 'react';
import { PracticePanel } from '../practice/PracticePanel';
import { ExerciseList } from '../exercises/ExerciseList';
import { Tabs } from './Tabs';
import { useSamplerLoaded } from '../../hooks/useSamplerLoaded';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';
import type { TabId } from '../../state/ui-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';

const TABS: { id: TabId; label: string; badge?: number }[] = [
  { id: 'practice', label: 'Prática / Fretboard Livre' },
  { id: 'exercises', label: 'Exercícios', badge: EXERCISE_CATALOG.length },
];

export function App() {
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
    <div className="min-h-screen bg-body px-8 py-6 text-text-primary">
      <header className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.06] bg-surface text-sm font-bold">
          GT
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Estúdio de Prática</p>
          <h1 className="text-lg font-semibold">Guitar Teacher</h1>
        </div>
      </header>

      <Tabs tabs={TABS} activeTabId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

      {!samplerLoaded && (
        <p className="mt-4 text-sm text-text-secondary" role="status">
          Carregando sons...
        </p>
      )}

      {activeTab === 'practice' && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Modo Livre</p>
          <h2 className="mt-1 text-3xl font-bold">Explore o braço da guitarra.</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Escolha uma casa, encontre novas combinações e aqueça os dedos.
          </p>

          <div className="mt-6">
            <PracticePanel />
          </div>
        </section>
      )}

      {activeTab === 'exercises' && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Treino Guiado</p>
          <h2 className="mt-1 text-3xl font-bold">Continue sua evolução.</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Pratique com foco. Cada exercício foi pensado para construir sua técnica.
          </p>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row">
            <div className="lg:w-64">
              <ExerciseList />
            </div>
            <div className="flex-1">
              <PracticePanel />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

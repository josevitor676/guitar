import { useEffect } from 'react';
import { PracticePanel } from '../practice/PracticePanel';
import { ExerciseList } from '../exercises/ExerciseList';
import { ImportPanel } from '../import/ImportPanel';
import { ChordPanel } from '../chords/ChordPanel';
import { Tabs } from './Tabs';
import { useSamplerLoaded } from '../../hooks/useSamplerLoaded';
import { loadPreferences, initPersistence } from '../../state/persistence';
import { useFretboardStore } from '../../state/fretboard-store';
import { useMetronomeStore } from '../../state/metronome-store';
import { useUiStore } from '../../state/ui-store';
import { useExerciseStore } from '../../state/exercise-store';
import type { TabId } from '../../state/ui-store';
import { EXERCISE_CATALOG } from '../../domain/exercises/exercise-catalog';
import { ThemeToggle } from './ThemeToggle';
import { useThemeStore, readStoredTheme } from '../../state/theme-store';

export function App() {
  const samplerLoaded = useSamplerLoaded();
  const activeTab = useUiStore((state) => state.activeTab);
  const setActiveTab = useUiStore((state) => state.setActiveTab);
  const userExerciseCount = useExerciseStore((state) => state.userExercises.length);

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: 'practice', label: 'Prática / Fretboard Livre' },
    { id: 'exercises', label: 'Exercícios', badge: EXERCISE_CATALOG.length + userExerciseCount },
    { id: 'import', label: 'Importar' },
    { id: 'chords', label: 'Acordes' },
  ];

  useEffect(() => {
    useThemeStore.getState().setTheme(readStoredTheme());
    useExerciseStore.getState().hydrateUserExercises();
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
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge bg-surface text-sm font-bold">
          GT
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-text-secondary">Estúdio de Prática</p>
          <h1 className="text-lg font-semibold">Guitar Teacher</h1>
        </div>

        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>

      <Tabs
        tabs={tabs}
        activeTabId={activeTab}
        onChange={(id) => {
          // Walking over to free practice means leaving the exercise behind:
          // finding its notes still on the neck reads as the app having
          // ignored the move.
          if (id === 'practice') useExerciseStore.getState().leaveExercise();
          setActiveTab(id as TabId);
        }}
      />

      {!samplerLoaded && (
        <p className="mt-4 text-sm text-text-secondary" role="status">
          Carregando sons...
        </p>
      )}

      {activeTab === 'practice' && (
        <section className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Modo Livre</p>
          <h2 className="mt-1 text-3xl font-bold">Explore o braço da guitarra.</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Escolha uma casa, encontre novas combinações e aqueça os dedos.
          </p>

          <div className="mt-4">
            <PracticePanel />
          </div>
        </section>
      )}

      {activeTab === 'import' && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Do seu arquivo</p>
          <h2 className="mt-1 text-3xl font-bold">Traga um exercício de fora.</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Suba a tablatura que você achou e eu monto ela no braço para você praticar.
          </p>

          <div className="mt-6">
            <ImportPanel />
          </div>
        </section>
      )}

      {activeTab === 'chords' && (
        <section className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Harmonia</p>
          <h2 className="mt-1 text-3xl font-bold">Monte e descubra acordes.</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Escolha as notas no braço e eu digo que acorde é, com outras posições para tocá-lo.
          </p>

          <div className="mt-6">
            <ChordPanel />
          </div>
        </section>
      )}

      {activeTab === 'exercises' && (
        // The section takes what is left of the window and the two columns
        // scroll inside it, so the catalog can grow without the page growing.
        // The reserve is what the page spends above the section: the header
        // and its margin, the tabs, and the page padding. Too small and the
        // page itself scrolls; too large and the panel is cut short.
        <section className="mt-4 flex h-[calc(100vh-12rem)] flex-col">
          {/*
            One line rather than a heading block. On this tab the neck and the
            roll are stacked, and on a shorter window every row of chrome above
            them is a row the student loses off the bottom.
          */}
          <div className="flex items-baseline gap-3">
            <h2 className="text-xl font-bold">Continue sua evolução.</h2>
            <p className="text-sm text-text-secondary">
              Pratique com foco. Cada exercício constrói uma técnica.
            </p>
          </div>

          {/* min-h-0 lets the children shrink; without it a flex child refuses
              to go below its content height and the section overflows anyway. */}
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-6 lg:flex-row">
            <div className="subtle-scroll min-h-0 overflow-y-auto pr-1 lg:w-64">
              <ExerciseList />
            </div>
            {/* min-w-0: without it the flex item will not shrink below the
                timeline's own width, and the page grows a horizontal scrollbar
                instead of the timeline scrolling inside its card. */}
            <div className="subtle-scroll min-h-0 min-w-0 flex-1 overflow-y-auto">
              <PracticePanel />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

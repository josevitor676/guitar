import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useExerciseStore } from './exercise-store';
import { useFretboardStore } from './fretboard-store';
import { EXERCISE_CATALOG } from '../domain/exercises/exercise-catalog';
import { useMetronomeStore } from './metronome-store';
import { useUiStore } from './ui-store';
import { useSpeedTrainerStore } from './speed-trainer-store';

describe('useExerciseStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useExerciseStore.setState({ activeExerciseId: null, userExercises: [] });
    useFretboardStore.setState({ selectedNotes: [], minFret: 1, maxFret: 7 });
    useSpeedTrainerStore.setState({ lastResult: null, session: null });
    useMetronomeStore.setState({ bpm: 100, subdivision: 'quarter' });
    useUiStore.setState({ fretboardView: 'grid' });
  });

  it('starts with no active exercise', () => {
    expect(useExerciseStore.getState().activeExerciseId).toBeNull();
  });

  it('sets activeExerciseId when a known exercise is selected', () => {
    const [first] = EXERCISE_CATALOG;
    useExerciseStore.getState().selectExercise(first.id);
    expect(useExerciseStore.getState().activeExerciseId).toBe(first.id);
  });

  it('loads the exercise positions into the fretboard store', () => {
    const [first] = EXERCISE_CATALOG;
    useExerciseStore.getState().selectExercise(first.id);
    expect(useFretboardStore.getState().selectedNotes).toEqual(first.positions);
  });

  it('widens the visible fret range to cover an exercise whose positions fall outside the current range', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 10 });
    const exercise = EXERCISE_CATALOG.find((item) => item.id === 'warmup-1234-low-e')!;

    useExerciseStore.getState().selectExercise(exercise.id);

    const { minFret, maxFret } = useFretboardStore.getState();
    const frets = exercise.positions.map((position) => position.fret);
    expect(minFret).toBeLessThanOrEqual(Math.min(...frets));
    expect(maxFret).toBeGreaterThanOrEqual(Math.max(...frets));
  });

  it('never widens the visible range below fret 1', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 10 });
    const exercise = EXERCISE_CATALOG.find((item) => item.id === 'scale-c-major-open-position')!;

    useExerciseStore.getState().selectExercise(exercise.id);

    expect(useFretboardStore.getState().minFret).toBeGreaterThanOrEqual(1);
  });

  it('does nothing when selecting an unknown exercise id', () => {
    useExerciseStore.getState().selectExercise('does-not-exist');
    expect(useExerciseStore.getState().activeExerciseId).toBeNull();
    expect(useFretboardStore.getState().selectedNotes).toEqual([]);
  });

  describe('the student library', () => {
    it('refuses to save an empty selection', () => {
      expect(useExerciseStore.getState().saveCurrentSelection('Nada')).toBeNull();
      expect(useExerciseStore.getState().userExercises).toEqual([]);
    });

    it('refuses to save under a name that is only whitespace', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });

      expect(useExerciseStore.getState().saveCurrentSelection('   ')).toBeNull();
      expect(useExerciseStore.getState().userExercises).toEqual([]);
    });

    it('captures the selection with the tempo and rhythm figure in force', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      useMetronomeStore.setState({ bpm: 76, subdivision: 'triplet' });

      const saved = useExerciseStore.getState().saveCurrentSelection('  Aquecimento meu  ');

      expect(saved).toMatchObject({
        name: 'Aquecimento meu',
        category: 'meu',
        bpm: 76,
        subdivision: 'triplet',
        positions: [{ string: 6, fret: 3 }],
      });
      expect(useExerciseStore.getState().userExercises).toHaveLength(1);
    });

    it('makes the newly saved exercise the active one', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });

      const saved = useExerciseStore.getState().saveCurrentSelection('Meu');

      expect(useExerciseStore.getState().activeExerciseId).toBe(saved!.id);
    });

    it('keeps the newest exercise first', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      useExerciseStore.getState().saveCurrentSelection('Primeiro');
      useExerciseStore.getState().saveCurrentSelection('Segundo');

      expect(useExerciseStore.getState().userExercises.map((item) => item.name)).toEqual([
        'Segundo',
        'Primeiro',
      ]);
    });

    it('gives two exercises saved in the same millisecond different ids', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const first = useExerciseStore.getState().saveCurrentSelection('Um');
      const second = useExerciseStore.getState().saveCurrentSelection('Dois');

      expect(first!.id).not.toBe(second!.id);
      vi.restoreAllMocks();
    });

    it('survives a reload through hydrateUserExercises', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      useExerciseStore.getState().saveCurrentSelection('Persistido');

      useExerciseStore.setState({ userExercises: [] });
      useExerciseStore.getState().hydrateUserExercises();

      expect(useExerciseStore.getState().userExercises.map((item) => item.name)).toEqual(['Persistido']);
    });

    it('restores the saved tempo and rhythm figure when the exercise is selected', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 7 }] });
      useMetronomeStore.setState({ bpm: 76, subdivision: 'triplet' });
      const saved = useExerciseStore.getState().saveCurrentSelection('Meu');

      useMetronomeStore.setState({ bpm: 120, subdivision: 'quarter' });
      useFretboardStore.setState({ selectedNotes: [] });

      useExerciseStore.getState().selectExercise(saved!.id);

      expect(useFretboardStore.getState().selectedNotes).toEqual([{ string: 6, fret: 7 }]);
      expect(useMetronomeStore.getState().bpm).toBe(76);
      expect(useMetronomeStore.getState().subdivision).toBe('triplet');
    });

    it('widens the fret range for a student exercise too', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 12 }] });
      const saved = useExerciseStore.getState().saveCurrentSelection('Alto');

      useFretboardStore.setState({ minFret: 1, maxFret: 7 });
      useExerciseStore.getState().selectExercise(saved!.id);

      expect(useFretboardStore.getState().maxFret).toBeGreaterThanOrEqual(12);
    });

    it('removes an exercise from the store and from storage', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      const saved = useExerciseStore.getState().saveCurrentSelection('Descartável');

      useExerciseStore.getState().deleteUserExercise(saved!.id);

      expect(useExerciseStore.getState().userExercises).toEqual([]);
      useExerciseStore.getState().hydrateUserExercises();
      expect(useExerciseStore.getState().userExercises).toEqual([]);
    });

    it('clears the active exercise when that exercise is the one removed', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      const saved = useExerciseStore.getState().saveCurrentSelection('Ativo');

      useExerciseStore.getState().deleteUserExercise(saved!.id);

      expect(useExerciseStore.getState().activeExerciseId).toBeNull();
    });

    it('leaves a different active exercise alone when removing one', () => {
      useFretboardStore.setState({ selectedNotes: [{ string: 6, fret: 3 }] });
      const doomed = useExerciseStore.getState().saveCurrentSelection('Some');
      const kept = useExerciseStore.getState().saveCurrentSelection('Fica');

      useExerciseStore.getState().deleteUserExercise(doomed!.id);

      expect(useExerciseStore.getState().activeExerciseId).toBe(kept!.id);
    });
  });

  describe('technique exercises', () => {
    it('opens an exercise built on a technique in the timeline, where its slurs survive', () => {
      useExerciseStore.getState().selectExercise('technique-hammer-on-ladder');

      expect(useUiStore.getState().fretboardView).toBe('timeline');
    });

    it('loads the slurs along with the notes', () => {
      useExerciseStore.getState().selectExercise('technique-slide-shift');

      const loaded = useFretboardStore.getState().selectedNotes;
      expect(loaded.some((position) => position.articulation === 'slide')).toBe(true);
    });

    it('leaves the view alone for an exercise with no technique in it', () => {
      useExerciseStore.getState().selectExercise('warmup-1234-low-e');

      expect(useUiStore.getState().fretboardView).toBe('grid');
    });
  });

  describe('leaveExercise', () => {
    it('takes the exercise and its notes off the neck', () => {
      useExerciseStore.getState().selectExercise('warmup-1234-low-e');

      useExerciseStore.getState().leaveExercise();

      expect(useExerciseStore.getState().activeExerciseId).toBeNull();
      expect(useFretboardStore.getState().selectedNotes).toEqual([]);
    });

    // Free practice is the student's own scratch space. Wiping it because they
    // looked at the chord tab and came back would throw away their work.
    it('leaves free practice alone, since no exercise was open', () => {
      useExerciseStore.setState({ activeExerciseId: null });
      useFretboardStore.getState().loadSequence([{ string: 6, fret: 3 }]);

      useExerciseStore.getState().leaveExercise();

      expect(useFretboardStore.getState().selectedNotes).toHaveLength(1);
    });

    it('clears the speed-training result, which belonged to the exercise', () => {
      useExerciseStore.getState().selectExercise('warmup-1234-low-e');
      useSpeedTrainerStore.setState({ lastResult: { startBpm: 80, bpm: 120 } });

      useExerciseStore.getState().leaveExercise();

      expect(useSpeedTrainerStore.getState().lastResult).toBeNull();
    });
  });

  it('clears the speed-training result when another exercise is opened', () => {
    useSpeedTrainerStore.setState({ lastResult: { startBpm: 80, bpm: 120 } });

    useExerciseStore.getState().selectExercise('warmup-1234-low-e');

    expect(useSpeedTrainerStore.getState().lastResult).toBeNull();
  });

  describe('updateActiveUserExercise', () => {
    function saveOne() {
      useFretboardStore.getState().loadSequence([
        { string: 6, fret: 3 },
        { string: 6, fret: 5 },
      ]);
      return useExerciseStore.getState().saveCurrentSelection('Exercício X');
    }

    it('writes the notes now on the neck over the exercise that is open', () => {
      const saved = saveOne();
      useFretboardStore.getState().extendPattern(1);

      useExerciseStore.getState().updateActiveUserExercise();

      const updated = useExerciseStore.getState().userExercises.find((e) => e.id === saved!.id);
      expect(updated!.positions.map((p) => p.fret)).toEqual([3, 5, 4, 6]);
    });

    it('keeps the change after a reload, or it was never saved at all', () => {
      saveOne();
      useFretboardStore.getState().extendPattern(1);
      useFretboardStore.getState().extendPattern(1);
      useExerciseStore.getState().updateActiveUserExercise();

      useExerciseStore.setState({ userExercises: [] });
      useExerciseStore.getState().hydrateUserExercises();

      expect(useExerciseStore.getState().userExercises[0].positions.map((p) => p.fret)).toEqual([
        3, 5, 4, 6, 5, 7,
      ]);
    });

    it('takes the tempo the student is working at now', () => {
      saveOne();
      useMetronomeStore.getState().setBpm(144);

      useExerciseStore.getState().updateActiveUserExercise();

      expect(useExerciseStore.getState().userExercises[0].bpm).toBe(144);
    });

    // The catalogue is the app's, not the student's; a change to one of those
    // has to become an exercise of their own.
    it('refuses to overwrite a catalogue exercise', () => {
      useExerciseStore.getState().selectExercise('warmup-1234-low-e');
      useFretboardStore.getState().extendPattern(1);

      expect(useExerciseStore.getState().updateActiveUserExercise()).toBeNull();
      expect(useExerciseStore.getState().userExercises).toEqual([]);
    });

    it('does nothing with an empty neck', () => {
      saveOne();
      useFretboardStore.getState().clearSelection();

      expect(useExerciseStore.getState().updateActiveUserExercise()).toBeNull();
    });
  });
});

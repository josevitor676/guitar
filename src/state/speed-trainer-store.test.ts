import { describe, it, expect, beforeEach } from 'vitest';
import { useSpeedTrainerStore, SPEED_RECORDS_STORAGE_KEY } from './speed-trainer-store';
import { DEFAULT_TRAINING } from '../domain/practice/speed-trainer';

describe('useSpeedTrainerStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useSpeedTrainerStore.setState({
      enabled: false,
      training: DEFAULT_TRAINING,
      session: null,
      records: {},
    });
  });

  it('starts switched off, with the default climb', () => {
    const state = useSpeedTrainerStore.getState();
    expect(state.enabled).toBe(false);
    expect(state.training).toEqual(DEFAULT_TRAINING);
    expect(state.session).toBeNull();
  });

  it('opens a session at the starting tempo', () => {
    useSpeedTrainerStore.getState().startSession();
    expect(useSpeedTrainerStore.getState().session).toMatchObject({ bpm: 80, loopsDone: 0 });
  });

  it('advances the session one loop at a time', () => {
    const store = useSpeedTrainerStore.getState();
    store.setTraining({ startBpm: 80, stepBpm: 10, loopsPerStep: 2, targetBpm: 100 });
    store.startSession();

    useSpeedTrainerStore.getState().completeLoop();
    useSpeedTrainerStore.getState().completeLoop();

    expect(useSpeedTrainerStore.getState().session).toMatchObject({ bpm: 90, loopsDone: 0 });
  });

  it('ignores a loop when no session is open, so free practice is untouched', () => {
    useSpeedTrainerStore.getState().completeLoop();
    expect(useSpeedTrainerStore.getState().session).toBeNull();
  });

  it('freezes the climb where it is when the student holds', () => {
    const store = useSpeedTrainerStore.getState();
    store.setTraining({ startBpm: 80, stepBpm: 10, loopsPerStep: 1, targetBpm: 200 });
    store.startSession();

    useSpeedTrainerStore.getState().hold();
    useSpeedTrainerStore.getState().completeLoop();

    expect(useSpeedTrainerStore.getState().session).toMatchObject({ bpm: 80, held: true });
  });

  describe('the record', () => {
    it('remembers the fastest tempo actually played for an exercise', () => {
      const store = useSpeedTrainerStore.getState();
      store.setTraining({ startBpm: 80, stepBpm: 10, loopsPerStep: 1, targetBpm: 200 });
      store.startSession();
      useSpeedTrainerStore.getState().completeLoop();

      useSpeedTrainerStore.getState().endSession('celula-357');

      expect(useSpeedTrainerStore.getState().records['celula-357']).toBe(90);
    });

    it('keeps the old record when the session ended slower', () => {
      useSpeedTrainerStore.setState({ records: { 'celula-357': 120 } });
      useSpeedTrainerStore.getState().startSession();

      useSpeedTrainerStore.getState().endSession('celula-357');

      expect(useSpeedTrainerStore.getState().records['celula-357']).toBe(120);
    });

    it('records nothing for free practice, which has no exercise to attach it to', () => {
      useSpeedTrainerStore.getState().startSession();
      useSpeedTrainerStore.getState().endSession(null);

      expect(useSpeedTrainerStore.getState().records).toEqual({});
    });

    it('survives a reload, since a record the app forgets is worth nothing', () => {
      useSpeedTrainerStore.getState().startSession();
      useSpeedTrainerStore.getState().endSession('celula-357');

      expect(JSON.parse(localStorage.getItem(SPEED_RECORDS_STORAGE_KEY) ?? '{}')).toEqual({
        'celula-357': 80,
      });
    });

    it('closes the session when it ends', () => {
      useSpeedTrainerStore.getState().startSession();
      useSpeedTrainerStore.getState().endSession(null);

      expect(useSpeedTrainerStore.getState().session).toBeNull();
    });
  });
});

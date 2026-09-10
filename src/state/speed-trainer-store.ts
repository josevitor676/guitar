import { create } from 'zustand';
import type { Training, TrainingState } from '../domain/practice/speed-trainer';
import {
  DEFAULT_TRAINING,
  beginTraining,
  afterLoop,
  holdHere,
} from '../domain/practice/speed-trainer';

export const SPEED_RECORDS_STORAGE_KEY = 'guitar-teacher:speed-records';

/** The fastest tempo an exercise has actually been played at, by exercise id. */
type Records = Record<string, number>;

function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(SPEED_RECORDS_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, bpm]) => typeof bpm === 'number' && Number.isFinite(bpm),
      ),
    ) as Records;
  } catch {
    return {};
  }
}

interface SpeedTrainerStore {
  enabled: boolean;
  training: Training;
  /** Non-null only while a training run is under way. */
  session: TrainingState | null;
  records: Records;
  /** What the last completed climb reached, kept so the result can be shown
   *  after the session itself has closed. */
  lastResult: { startBpm: number; bpm: number } | null;
  setEnabled: (enabled: boolean) => void;
  setTraining: (training: Training) => void;
  startSession: () => void;
  completeLoop: () => void;
  hold: () => void;
  /** Closes the run and keeps the tempo reached, if it beats what is on record. */
  endSession: (exerciseId: string | null) => void;
}

export const useSpeedTrainerStore = create<SpeedTrainerStore>((set, get) => ({
  enabled: false,
  training: DEFAULT_TRAINING,
  session: null,
  records: loadRecords(),
  lastResult: null,

  setEnabled: (enabled) => set({ enabled }),
  setTraining: (training) => set({ training }),
  startSession: () =>
    set((state) => ({ session: beginTraining(state.training), lastResult: null })),

  completeLoop: () =>
    set((state) => (state.session ? { session: afterLoop(state.session, state.training) } : {})),

  hold: () => set((state) => (state.session ? { session: holdHere(state.session) } : {})),

  endSession: (exerciseId) => {
    const { session, records, training } = get();
    if (!session) return set({ session: null });

    const lastResult = session.finished ? { startBpm: training.startBpm, bpm: session.bpm } : null;
    if (!exerciseId) return set({ session: null, lastResult });

    // The record is the tempo reached, not the target aimed at: a session
    // abandoned at 95 is worth 95, and one held at 95 is worth exactly the same.
    const best = Math.max(records[exerciseId] ?? 0, session.bpm);
    const updated = { ...records, [exerciseId]: best };
    try {
      localStorage.setItem(SPEED_RECORDS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // A full or blocked storage costs the student the record, not the session.
    }
    set({ session: null, records: updated, lastResult });
  },
}));

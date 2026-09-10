/**
 * Speed training: play a passage at a tempo you can hold, and only move up
 * once you have held it. The rule is the whole point — a student left to
 * raise the tempo themselves either forgets to, and stays slow for an hour,
 * or jumps ahead and drills the mistake in.
 */
export interface Training {
  startBpm: number;
  stepBpm: number;
  /** How many times round the sequence before the tempo goes up. */
  loopsPerStep: number;
  targetBpm: number;
}

export interface TrainingState {
  bpm: number;
  /** Loops played at the current tempo, not since the session began. */
  loopsDone: number;
  /** The student stopped the climb here, because this tempo is not clean yet. */
  held: boolean;
  finished: boolean;
}

export const DEFAULT_TRAINING: Training = {
  startBpm: 80,
  stepBpm: 5,
  loopsPerStep: 4,
  targetBpm: 140,
};

export function isValidTraining(training: Training): boolean {
  return (
    Number.isFinite(training.startBpm) &&
    training.startBpm > 0 &&
    training.stepBpm >= 1 &&
    training.loopsPerStep >= 1 &&
    // Equal is allowed: it is a plain loop at one tempo, which is a legitimate
    // way to use the trainer.
    training.targetBpm >= training.startBpm
  );
}

/**
 * Whether the sequence has just come round again.
 *
 * The player reports the note it is on, so a loop shows up as the index
 * falling back to zero. The very first note is index zero too, which is why
 * the note before matters: a loop is a *return* to the start, not a start.
 */
export function completedLoop(previousIndex: number | null, index: number): boolean {
  return previousIndex !== null && previousIndex !== 0 && index === 0;
}

export function beginTraining(training: Training): TrainingState {
  return { bpm: training.startBpm, loopsDone: 0, held: false, finished: false };
}

export function holdHere(state: TrainingState): TrainingState {
  return { ...state, held: true };
}

export function loopsRemaining(state: TrainingState, training: Training): number {
  return Math.max(0, training.loopsPerStep - state.loopsDone);
}

/**
 * Advances the session by one time round the sequence.
 *
 * Reaching the target tempo is not the end: the quota has to be played *at*
 * the target, or the session would finish the instant the number arrived,
 * before the student had played a single loop at the speed they were working
 * towards.
 */
export function afterLoop(state: TrainingState, training: Training): TrainingState {
  if (state.finished || state.held) return state;

  const loopsDone = state.loopsDone + 1;
  if (loopsDone < training.loopsPerStep) return { ...state, loopsDone };

  if (state.bpm >= training.targetBpm) return { ...state, loopsDone: 0, finished: true };

  return { ...state, bpm: Math.min(state.bpm + training.stepBpm, training.targetBpm), loopsDone: 0 };
}

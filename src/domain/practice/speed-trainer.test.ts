import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TRAINING,
  beginTraining,
  afterLoop,
  holdHere,
  loopsRemaining,
  isValidTraining,
  completedLoop,
} from './speed-trainer';
import type { Training } from './speed-trainer';

const training: Training = { startBpm: 80, stepBpm: 5, loopsPerStep: 4, targetBpm: 95 };

describe('beginTraining', () => {
  it('opens at the starting tempo with no loops behind it', () => {
    expect(beginTraining(training)).toEqual({
      bpm: 80,
      loopsDone: 0,
      held: false,
      finished: false,
    });
  });
});

describe('afterLoop', () => {
  it('counts a loop without touching the tempo until the quota is met', () => {
    const state = afterLoop(beginTraining(training), training);
    expect(state).toMatchObject({ bpm: 80, loopsDone: 1 });
  });

  it('raises the tempo once the quota is met, and starts counting again', () => {
    let state = beginTraining(training);
    for (let i = 0; i < 4; i += 1) state = afterLoop(state, training);

    expect(state).toMatchObject({ bpm: 85, loopsDone: 0, finished: false });
  });

  it('never overshoots the target, however big the step', () => {
    const bigStep: Training = { ...training, stepBpm: 40 };
    let state = beginTraining(bigStep);
    for (let i = 0; i < 4; i += 1) state = afterLoop(state, bigStep);

    expect(state.bpm).toBe(95);
  });

  // The point of the target is to be played at, not merely reached: finishing
  // the moment the tempo arrives would end the session before the student has
  // played a single loop at the speed they were working towards.
  it('finishes only after the quota has been played at the target tempo', () => {
    let state = { bpm: 95, loopsDone: 0, held: false, finished: false };

    for (let i = 0; i < 3; i += 1) state = afterLoop(state, training);
    expect(state.finished).toBe(false);

    state = afterLoop(state, training);
    expect(state).toMatchObject({ bpm: 95, finished: true });
  });

  it('leaves a held session exactly where it is', () => {
    let state = holdHere(beginTraining(training));
    for (let i = 0; i < 10; i += 1) state = afterLoop(state, training);

    expect(state).toMatchObject({ bpm: 80, held: true, finished: false });
  });

  it('leaves a finished session alone', () => {
    const finished = { bpm: 95, loopsDone: 0, held: false, finished: true };
    expect(afterLoop(finished, training)).toBe(finished);
  });
});

describe('loopsRemaining', () => {
  it('counts down to the next tempo change', () => {
    expect(loopsRemaining({ bpm: 80, loopsDone: 1, held: false, finished: false }, training)).toBe(3);
  });
});

describe('isValidTraining', () => {
  it('accepts the defaults', () => {
    expect(isValidTraining(DEFAULT_TRAINING)).toBe(true);
  });

  it('rejects a target below the start, which could never be reached', () => {
    expect(isValidTraining({ ...training, targetBpm: 60 })).toBe(false);
  });

  it('accepts a target equal to the start, which is a plain loop at one tempo', () => {
    expect(isValidTraining({ ...training, targetBpm: 80 })).toBe(true);
  });

  it('rejects a step or a quota of zero, which would never advance', () => {
    expect(isValidTraining({ ...training, stepBpm: 0 })).toBe(false);
    expect(isValidTraining({ ...training, loopsPerStep: 0 })).toBe(false);
  });
});

describe('completedLoop', () => {
  it('sees the sequence come round again', () => {
    expect(completedLoop(7, 0)).toBe(true);
  });

  it('does not count the very first note as a loop', () => {
    expect(completedLoop(null, 0)).toBe(false);
  });

  it('does not count a one-note sequence repeating index zero', () => {
    expect(completedLoop(0, 0)).toBe(false);
  });

  it('ignores notes in the middle of the sequence', () => {
    expect(completedLoop(3, 4)).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const triggerAttackRelease = vi.fn();
const loopStart = vi.fn();
const loopStop = vi.fn();
const loopDispose = vi.fn();
const transportStart = vi.fn();
const transportStop = vi.fn();

let capturedLoopCallback: ((time: number) => void) | undefined;
let capturedLoopInterval: string | undefined;
let lastLoopInstance: { interval: string } | undefined;

vi.mock('tone', () => {
  return {
    Synth: function() {
      return {
        toDestination: vi.fn().mockReturnThis(),
        triggerAttackRelease,
      };
    },
    Draw: { schedule: (callback: () => void) => callback() },
    Loop: function(callback: (time: number) => void, interval: string) {
      capturedLoopCallback = callback;
      capturedLoopInterval = interval;
      lastLoopInstance = { interval };
      return {
        start: loopStart.mockReturnValue({ stop: loopStop, dispose: loopDispose }),
        stop: loopStop,
        dispose: loopDispose,
        get interval() {
          return lastLoopInstance!.interval;
        },
        set interval(value: string) {
          lastLoopInstance!.interval = value;
        },
      };
    },
    Transport: {
      start() { return transportStart(); },
      stop() { return transportStop(); },
      bpm: { value: 120 },
    },
  };
});

import { ToneMetronome } from './metronome';
import * as Tone from 'tone';

describe('ToneMetronome', () => {
  beforeEach(() => {
    triggerAttackRelease.mockClear();
    transportStart.mockClear();
    transportStop.mockClear();
    capturedLoopCallback = undefined;
    capturedLoopInterval = undefined;
  });

  it('starts the Tone.Transport and schedules a quarter-note loop by default', () => {
    const metronome = new ToneMetronome();
    metronome.start();
    expect(transportStart).toHaveBeenCalled();
    expect(capturedLoopInterval).toBe('4n');
  });

  it('sets Tone.Transport.bpm.value when setBpm is called', () => {
    const metronome = new ToneMetronome();
    metronome.setBpm(90);
    expect(Tone.Transport.bpm.value).toBe(90);
  });

  it('notifies pulse listeners each time the loop fires', () => {
    const metronome = new ToneMetronome();
    const onPulse = vi.fn();
    metronome.onPulse(onPulse);
    metronome.start();
    capturedLoopCallback?.(0);
    capturedLoopCallback?.(0.5);
    expect(onPulse).toHaveBeenNthCalledWith(1, 0);
    expect(onPulse).toHaveBeenNthCalledWith(2, 1);
  });

  it('stops notifying after unsubscribe', () => {
    const metronome = new ToneMetronome();
    const onPulse = vi.fn();
    const unsubscribe = metronome.onPulse(onPulse);
    metronome.start();
    unsubscribe();
    capturedLoopCallback?.(0);
    expect(onPulse).not.toHaveBeenCalled();
  });

  it('stops only its own loop on stop(), leaving Tone.Transport running for sequence playback', () => {
    const metronome = new ToneMetronome();
    metronome.start();
    metronome.stop();
    expect(loopStop).toHaveBeenCalled();
    expect(transportStop).not.toHaveBeenCalled();
  });

  it('accents the downbeat and ticks the rest of the bar, both at the scheduled time', () => {
    const metronome = new ToneMetronome();
    metronome.start();
    triggerAttackRelease.mockClear();

    for (let pulse = 0; pulse < 5; pulse += 1) capturedLoopCallback?.(pulse * 0.5);

    const pitches = triggerAttackRelease.mock.calls.map(([pitch]) => pitch);
    expect(pitches[0]).not.toBe(pitches[1]);
    expect(pitches[4]).toBe(pitches[0]);
    expect(pitches[1]).toBe(pitches[2]);

    // Every click carries the transport time it was scheduled for.
    expect(triggerAttackRelease.mock.calls.map(([, , time]) => time)).toEqual([0, 0.5, 1, 1.5, 2]);
  });

  it('makes a click, not a drum: the envelope decays almost immediately', () => {
    const metronome = new ToneMetronome();
    metronome.start();
    triggerAttackRelease.mockClear();

    capturedLoopCallback?.(0);

    const [, length] = triggerAttackRelease.mock.calls[0];
    expect(length).toBeLessThan(0.05);
  });
});

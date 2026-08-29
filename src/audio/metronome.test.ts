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
    MembraneSynth: function() {
      return {
        toDestination: vi.fn().mockReturnThis(),
        triggerAttackRelease,
      };
    },
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

  it('stops the transport on stop()', () => {
    const metronome = new ToneMetronome();
    metronome.start();
    metronome.stop();
    expect(transportStop).toHaveBeenCalled();
  });
});

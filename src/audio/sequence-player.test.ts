import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { INoteSampler } from './audio-engine.types';

const sequenceStart = vi.fn();
const sequenceDispose = vi.fn();
const transportStart = vi.fn();
const transportStop = vi.fn();

let capturedCallback: ((time: number, index: number) => void) | undefined;
let capturedEvents: number[] | undefined;
let capturedInterval: string | undefined;

vi.mock('tone', () => {
  return {
    Sequence: vi.fn().mockImplementation(
      function (callback: (time: number, index: number) => void, events: number[], interval: string) {
        capturedCallback = callback;
        capturedEvents = events;
        capturedInterval = interval;
        return {
          start: sequenceStart.mockReturnValue({ dispose: sequenceDispose }),
          dispose: sequenceDispose,
        };
      },
    ),
    Transport: {
      start: () => transportStart(),
      stop: () => transportStop(),
      bpm: { value: 120 },
    },
  };
});

import { ToneSequencePlayer } from './sequence-player';
import * as Tone from 'tone';

function createFakeSampler(): INoteSampler {
  return {
    isLoaded: () => true,
    playNote: vi.fn(),
  };
}

describe('ToneSequencePlayer', () => {
  beforeEach(() => {
    sequenceStart.mockClear();
    sequenceDispose.mockClear();
    transportStart.mockClear();
    transportStop.mockClear();
    capturedCallback = undefined;
  });

  it('sets the transport BPM and schedules one event per note', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play([{ frequency: 220 }, { frequency: 440 }], 100, 'eighth');

    expect(Tone.Transport.bpm.value).toBe(100);
    expect(capturedEvents).toEqual([0, 1]);
    expect(capturedInterval).toBe('8n');
    expect(transportStart).toHaveBeenCalled();
  });

  it('plays the correct note frequency when the sequence callback fires', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play([{ frequency: 220 }, { frequency: 440 }], 100, 'quarter');

    capturedCallback?.(0, 1);
    expect(sampler.playNote).toHaveBeenCalledWith(440, '4n');
  });

  it('notifies note-change listeners with the current index', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    const onNoteChange = vi.fn();
    player.onNoteChange(onNoteChange);
    player.play([{ frequency: 220 }], 100, 'quarter');

    capturedCallback?.(0, 0);
    expect(onNoteChange).toHaveBeenCalledWith(0);
  });

  it('disposes the previous sequence when stop is called', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);
    player.play([{ frequency: 220 }], 100, 'quarter');
    player.stop();
    expect(sequenceDispose).toHaveBeenCalled();
  });

  it('resets the transport position before starting, so a second play() always restarts from the beginning of the sequence', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler);

    // Simulates: user plays, stops partway through (transport keeps advancing
    // ticks internally), then plays again — the new sequence must restart at
    // index 0, not resume from wherever the transport's clock happened to be.
    player.play([{ frequency: 220 }, { frequency: 440 }], 100, 'quarter');
    player.stop();
    transportStop.mockClear();
    transportStart.mockClear();

    player.play([{ frequency: 220 }, { frequency: 440 }], 100, 'quarter');

    expect(transportStop).toHaveBeenCalled();
    const stopOrder = transportStop.mock.invocationCallOrder[0];
    const startOrder = transportStart.mock.invocationCallOrder[0];
    expect(stopOrder).toBeLessThan(startOrder);
  });
});

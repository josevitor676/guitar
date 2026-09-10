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

function createFakeGlideVoice() {
  return { playGlide: vi.fn() };
}

function createFakeSampler(): INoteSampler {
  return {
    isLoaded: () => true,
    playNote: vi.fn(),
    playSlurred: vi.fn(),
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

  it('sets the transport BPM and schedules one event per note, using the spacing subdivision as the step interval', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());
    player.play(
      [
        { frequency: 220, duration: '8n' },
        { frequency: 440, duration: '8n' },
      ],
      100,
      'eighth',
    );

    expect(Tone.Transport.bpm.value).toBe(100);
    expect(capturedEvents).toEqual([0, 1]);
    expect(capturedInterval).toBe('8n');
    expect(transportStart).toHaveBeenCalled();
  });

  it("plays each note with its own duration, independent of the sequence's spacing subdivision", () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());
    // Spacing is 'quarter' (4n), but the second note carries its own '8n'
    // duration — proving playNote uses the note's duration, not the spacing.
    player.play(
      [
        { frequency: 220, duration: '4n' },
        { frequency: 440, duration: '8n' },
      ],
      100,
      'quarter',
    );

    capturedCallback?.(0, 1);
    expect(sampler.playNote).toHaveBeenCalledWith(440, '8n', expect.anything(), undefined);
  });

  it('notifies note-change listeners with the current index', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());
    const onNoteChange = vi.fn();
    player.onNoteChange(onNoteChange);
    player.play([{ frequency: 220, duration: '4n' }], 100, 'quarter');

    capturedCallback?.(0, 0);
    expect(onNoteChange).toHaveBeenCalledWith(0);
  });

  it('disposes the previous sequence when stop is called', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());
    player.play([{ frequency: 220, duration: '4n' }], 100, 'quarter');
    player.stop();
    expect(sequenceDispose).toHaveBeenCalled();
  });

  it('resets the transport position before starting, so a second play() always restarts from the beginning of the sequence', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());

    player.play(
      [
        { frequency: 220, duration: '4n' },
        { frequency: 440, duration: '4n' },
      ],
      100,
      'quarter',
    );
    player.stop();
    transportStop.mockClear();
    transportStart.mockClear();

    player.play(
      [
        { frequency: 220, duration: '4n' },
        { frequency: 440, duration: '4n' },
      ],
      100,
      'quarter',
    );

    expect(transportStop).toHaveBeenCalled();
    const stopOrder = transportStop.mock.invocationCallOrder[0];
    const startOrder = transportStart.mock.invocationCallOrder[0];
    expect(stopOrder).toBeLessThan(startOrder);
  });

  it('sounds each note at the transport time it was scheduled for, not whenever the callback runs', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());

    player.play(
      [
        { frequency: 110, duration: '4n' },
        { frequency: 220, duration: '4n' },
      ],
      120,
      'quarter',
    );

    // Tone schedules callbacks ahead of the audio clock and hands them the beat
    // they belong to. Dropping that argument is what pulled the notes out of
    // step with the metronome, which does pass it.
    capturedCallback?.(1.5, 0);
    capturedCallback?.(2.0, 1);

    expect(sampler.playNote).toHaveBeenNthCalledWith(1, 110, '4n', 1.5, undefined);
    expect(sampler.playNote).toHaveBeenNthCalledWith(2, 220, '4n', 2.0, undefined);
  });

  it('runs the sequence silently when the metronome is leading', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());
    const advanced: number[] = [];
    player.onNoteChange((index) => advanced.push(index));

    player.play([{ frequency: 110, duration: '4n' }], 120, 'quarter', { silent: true });
    capturedCallback?.(0, 0);

    // The playhead still moves; only the guitar stays quiet.
    expect(sampler.playNote).not.toHaveBeenCalled();
    expect(advanced).toEqual([0]);
  });

  it('sounds the notes when no options are given at all', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());

    player.play([{ frequency: 110, duration: '4n' }], 120, 'quarter');
    capturedCallback?.(0, 0);

    expect(sampler.playNote).toHaveBeenCalledOnce();
  });

  it('sounds a slurred note softer than a picked one', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());

    player.play(
      [
        { frequency: 110, duration: '4n', velocity: 1 },
        { frequency: 130, duration: '4n', velocity: 0.45 },
      ],
      120,
      'quarter',
    );
    capturedCallback?.(0, 0);
    capturedCallback?.(0.5, 1);

    expect(sampler.playNote).toHaveBeenNthCalledWith(1, 110, '4n', 0, 1);
    expect(sampler.playNote).toHaveBeenNthCalledWith(2, 130, '4n', 0.5, 0.45);
  });

  it('hands a glided note to the voice that can move, not to the sampler', () => {
    const sampler = createFakeSampler();
    const glideVoice = createFakeGlideVoice();
    const player = new ToneSequencePlayer(sampler, glideVoice);

    player.play(
      [
        { frequency: 110, duration: '4n' },
        { frequency: 130, duration: '4n', velocity: 0.45, glide: { fromHz: 110, seconds: 0.09 } },
      ],
      120,
      'quarter',
    );
    capturedCallback?.(0, 0);
    capturedCallback?.(0.5, 1);

    expect(sampler.playNote).toHaveBeenCalledOnce();
    expect(glideVoice.playGlide).toHaveBeenCalledWith({
      fromHz: 110,
      toHz: 130,
      duration: '4n',
      glideSeconds: 0.09,
      time: 0.5,
      velocity: 0.45,
    });
  });

  it('keeps a glided note silent too when the metronome leads', () => {
    const sampler = createFakeSampler();
    const glideVoice = createFakeGlideVoice();
    const player = new ToneSequencePlayer(sampler, glideVoice);

    player.play(
      [{ frequency: 130, duration: '4n', glide: { fromHz: 110, seconds: 0.09 } }],
      120,
      'quarter',
      { silent: true },
    );
    capturedCallback?.(0, 0);

    expect(glideVoice.playGlide).not.toHaveBeenCalled();
  });

  it('sounds a hammered note on the soft-attack voice, not the picked one', () => {
    const sampler = createFakeSampler();
    const player = new ToneSequencePlayer(sampler, createFakeGlideVoice());

    player.play(
      [
        { frequency: 110, duration: '4n' },
        { frequency: 130, duration: '4n', velocity: 0.45, slurred: true },
      ],
      120,
      'quarter',
    );
    capturedCallback?.(0, 0);
    capturedCallback?.(0.5, 1);

    expect(sampler.playNote).toHaveBeenCalledOnce();
    expect(sampler.playSlurred).toHaveBeenCalledWith(130, '4n', 0.5, 0.45);
  });
});

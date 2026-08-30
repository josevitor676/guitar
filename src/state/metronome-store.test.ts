import { describe, it, expect, beforeEach } from 'vitest';
import { useMetronomeStore } from './metronome-store';

describe('useMetronomeStore', () => {
  beforeEach(() => {
    useMetronomeStore.setState({
      bpm: 100,
      subdivision: 'quarter',
      rhythmMode: 'note',
      subdivisionByString: { 1: 'quarter', 2: 'quarter', 3: 'quarter', 4: 'quarter', 5: 'quarter', 6: 'quarter' },
      isPlaying: false,
      currentPulse: 0,
    });
  });

  it('defaults to 100 BPM, quarter-note subdivision, stopped', () => {
    const state = useMetronomeStore.getState();
    expect(state.bpm).toBe(100);
    expect(state.subdivision).toBe('quarter');
    expect(state.isPlaying).toBe(false);
  });

  it('updates bpm via setBpm', () => {
    useMetronomeStore.getState().setBpm(140);
    expect(useMetronomeStore.getState().bpm).toBe(140);
  });

  it('updates subdivision via setSubdivision', () => {
    useMetronomeStore.getState().setSubdivision('sixteenth');
    expect(useMetronomeStore.getState().subdivision).toBe('sixteenth');
  });

  it('flips isPlaying to true on start and false on stop', () => {
    useMetronomeStore.getState().start();
    expect(useMetronomeStore.getState().isPlaying).toBe(true);
    useMetronomeStore.getState().stop();
    expect(useMetronomeStore.getState().isPlaying).toBe(false);
  });

  it('resets currentPulse to 0 on stop', () => {
    useMetronomeStore.getState().setCurrentPulse(3);
    useMetronomeStore.getState().stop();
    expect(useMetronomeStore.getState().currentPulse).toBe(0);
  });

  it('tracks the current pulse via setCurrentPulse', () => {
    useMetronomeStore.getState().setCurrentPulse(2);
    expect(useMetronomeStore.getState().currentPulse).toBe(2);
  });

  it('defaults to note mode with every string set to quarter subdivision', () => {
    const state = useMetronomeStore.getState();
    expect(state.rhythmMode).toBe('note');
    expect(state.subdivisionByString).toEqual({
      1: 'quarter',
      2: 'quarter',
      3: 'quarter',
      4: 'quarter',
      5: 'quarter',
      6: 'quarter',
    });
  });

  it('switches rhythm mode via setRhythmMode', () => {
    useMetronomeStore.getState().setRhythmMode('string');
    expect(useMetronomeStore.getState().rhythmMode).toBe('string');
  });

  it('updates only the targeted string via setStringSubdivision', () => {
    useMetronomeStore.getState().setStringSubdivision(6, 'eighth');
    const { subdivisionByString } = useMetronomeStore.getState();
    expect(subdivisionByString[6]).toBe('eighth');
    expect(subdivisionByString[1]).toBe('quarter');
  });
});

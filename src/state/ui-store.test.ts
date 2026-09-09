import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'practice', fretboardView: 'grid' });
  });

  it('defaults to the practice tab', () => {
    expect(useUiStore.getState().activeTab).toBe('practice');
  });

  it('switches to another tab via setActiveTab', () => {
    useUiStore.getState().setActiveTab('exercises');
    expect(useUiStore.getState().activeTab).toBe('exercises');
  });

  describe('fretboard view', () => {
    it('starts on the fret grid', () => {
      expect(useUiStore.getState().fretboardView).toBe('grid');
    });

    it('switches to the timeline and back', () => {
      useUiStore.getState().setFretboardView('timeline');
      expect(useUiStore.getState().fretboardView).toBe('timeline');

      useUiStore.getState().setFretboardView('grid');
      expect(useUiStore.getState().fretboardView).toBe('grid');
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './ui-store';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'practice' });
  });

  it('defaults to the practice tab', () => {
    expect(useUiStore.getState().activeTab).toBe('practice');
  });

  it('switches to another tab via setActiveTab', () => {
    useUiStore.getState().setActiveTab('exercises');
    expect(useUiStore.getState().activeTab).toBe('exercises');
  });
});

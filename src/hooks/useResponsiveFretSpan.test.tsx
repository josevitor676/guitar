import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRef } from 'react';
import { useFretboardStore } from '../state/fretboard-store';
import { useResponsiveFretSpan } from './useResponsiveFretSpan';

function renderWithWidth(clientWidth: number) {
  return renderHook(() => {
    const ref = useRef<HTMLElement | null>(null);
    if (!ref.current) {
      ref.current = { clientWidth } as HTMLElement;
    }
    useResponsiveFretSpan(ref);
  });
}

describe('useResponsiveFretSpan', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7 });
    vi.stubGlobal('ResizeObserver', undefined);
  });

  it('opens the neck to twelve frets when there is room', () => {
    renderWithWidth(40 + 56 * 12);

    expect(useFretboardStore.getState().maxFret).toBe(12);
  });

  it('shows fewer frets on a narrow screen', () => {
    renderWithWidth(40 + 56 * 6);

    expect(useFretboardStore.getState().maxFret).toBe(6);
  });

  it('resizes the window without moving where the student paged it to', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 11 });

    renderWithWidth(40 + 56 * 12);

    expect(useFretboardStore.getState()).toMatchObject({ minFret: 5, maxFret: 16 });
  });

  it('does nothing when there is no element to measure', () => {
    renderHook(() => useResponsiveFretSpan({ current: null }));

    expect(useFretboardStore.getState().maxFret).toBe(7);
  });
});

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

const LABEL = 40;
const CELL = 56;
/** The neck draws the label, then the open-string cell, then the frets. */
const NOT_FRETS = LABEL + CELL;

describe('useResponsiveFretSpan', () => {
  beforeEach(() => {
    useFretboardStore.setState({ minFret: 1, maxFret: 7 });
    vi.stubGlobal('ResizeObserver', undefined);
  });

  it('opens the neck to twelve frets when there is room', () => {
    renderWithWidth(NOT_FRETS + CELL * 12);

    expect(useFretboardStore.getState().maxFret).toBe(12);
  });

  it('shows fewer frets on a narrow screen', () => {
    renderWithWidth(NOT_FRETS + CELL * 6);

    expect(useFretboardStore.getState().maxFret).toBe(6);
  });

  it('resizes the window without moving where the student paged it to', () => {
    useFretboardStore.setState({ minFret: 5, maxFret: 11 });

    renderWithWidth(NOT_FRETS + CELL * 12);

    expect(useFretboardStore.getState()).toMatchObject({ minFret: 5, maxFret: 16 });
  });

  // The open string is a cell like any other and is always drawn, so the frets
  // get what is left after it. Measuring as though the label were the only
  // thing beside them makes the neck one cell wider than its container.
  it('leaves room for the open-string cell, not only for the string label', () => {
    renderWithWidth(NOT_FRETS + CELL * 6);
    const { minFret, maxFret } = useFretboardStore.getState();

    const drawnWidth = LABEL + CELL + (maxFret - minFret + 1) * CELL;
    expect(drawnWidth).toBeLessThanOrEqual(NOT_FRETS + CELL * 6);
  });

  it('does nothing when there is no element to measure', () => {
    renderHook(() => useResponsiveFretSpan({ current: null }));

    expect(useFretboardStore.getState().maxFret).toBe(7);
  });
});

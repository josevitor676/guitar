import { useEffect } from 'react';
import type { RefObject } from 'react';
import { fretSpanForWidth } from '../domain/fretboard/fretboard-model';
import { LABEL_WIDTH_PX, FRET_CELL_WIDTH_PX } from '../components/fretboard/fretboard-layout';
import { useFretboardStore } from '../state/fretboard-store';

/**
 * Keeps the number of visible frets matched to the space the neck has.
 *
 * The student controls where the window sits, by paging; how wide it is belongs
 * to the screen. Measuring the element rather than the viewport means the neck
 * still fits when something else shares the row with it.
 */
export function useResponsiveFretSpan(ref: RefObject<HTMLElement | null>): void {
  const setVisibleSpan = useFretboardStore((state) => state.setVisibleSpan);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const apply = () => {
      setVisibleSpan(fretSpanForWidth(element.clientWidth, FRET_CELL_WIDTH_PX, LABEL_WIDTH_PX));
    };

    apply();

    // Absent in jsdom and in older browsers; the one measurement above already
    // set a sensible span, so there is nothing to fall back to.
    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(apply);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, setVisibleSpan]);
}

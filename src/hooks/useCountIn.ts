import { useCallback, useRef, useState } from 'react';
import { COUNT_IN_BEATS } from '../domain/playback/count-in';

/**
 * Counts the student in before a sequence starts.
 *
 * Playback is already scheduled to begin after the count, so this only shows
 * the numbers: 1, 2, 3, then out of the way.
 */
export function useCountIn(bpm: number) {
  const [count, setCount] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setCount(null);
  }, []);

  const start = useCallback(() => {
    clear();
    const beatMs = (60 / bpm) * 1000;

    // The first beat shows at once: scheduling it would leave the button
    // looking unresponsive for a frame after the press.
    setCount(1);
    for (let beat = 1; beat < COUNT_IN_BEATS; beat += 1) {
      timers.current.push(setTimeout(() => setCount(beat + 1), beat * beatMs));
    }
    timers.current.push(setTimeout(() => setCount(null), COUNT_IN_BEATS * beatMs));
  }, [bpm, clear]);

  return { count, start, clear };
}

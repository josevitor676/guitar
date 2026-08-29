import { useEffect, useState } from 'react';
import { sampler } from '../audio';

const POLL_INTERVAL_MS = 100;

/**
 * Polls `sampler.isLoaded()` until it becomes true, then stops.
 *
 * The sampler loads its audio samples asynchronously; nothing else in the
 * app previously surfaced that loading state, so clicking a fret before
 * samples finished loading silently did nothing. This hook exposes that
 * state to the UI without changing the `INoteSampler` interface.
 */
export function useSamplerLoaded(): boolean {
  const [loaded, setLoaded] = useState(() => sampler.isLoaded());

  useEffect(() => {
    if (loaded) return;
    const interval = setInterval(() => {
      if (sampler.isLoaded()) {
        setLoaded(true);
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loaded]);

  return loaded;
}

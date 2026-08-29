import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { isLoaded } = vi.hoisted(() => ({
  isLoaded: vi.fn(),
}));

vi.mock('../audio', () => ({
  sampler: { isLoaded: () => isLoaded() },
}));

import { useSamplerLoaded } from './useSamplerLoaded';

describe('useSamplerLoaded', () => {
  beforeEach(() => {
    isLoaded.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true immediately when the sampler is already loaded', () => {
    isLoaded.mockReturnValue(true);
    const { result } = renderHook(() => useSamplerLoaded());
    expect(result.current).toBe(true);
  });

  it('starts false and flips to true once polling detects the sampler finished loading', async () => {
    let loaded = false;
    isLoaded.mockImplementation(() => loaded);

    const { result } = renderHook(() => useSamplerLoaded());
    expect(result.current).toBe(false);

    loaded = true;

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('stops polling once loaded (isLoaded call count stabilizes)', async () => {
    let loaded = false;
    isLoaded.mockImplementation(() => loaded);

    const { result } = renderHook(() => useSamplerLoaded());
    loaded = true;
    await waitFor(() => expect(result.current).toBe(true));

    const callsAfterLoaded = isLoaded.mock.calls.length;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    expect(isLoaded.mock.calls.length).toBe(callsAfterLoaded);
  });
});

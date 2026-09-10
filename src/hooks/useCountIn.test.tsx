import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountIn } from './useCountIn';

describe('useCountIn', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows nothing until it is started', () => {
    expect(renderHook(() => useCountIn(60)).result.current.count).toBeNull();
  });

  it('counts one, two, three at the tempo in force', () => {
    const { result } = renderHook(() => useCountIn(60));

    act(() => result.current.start());
    expect(result.current.count).toBe(1);

    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.count).toBe(2);

    act(() => void vi.advanceTimersByTime(1000));
    expect(result.current.count).toBe(3);
  });

  it('gets out of the way when the sequence begins', () => {
    const { result } = renderHook(() => useCountIn(60));

    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(3000));

    expect(result.current.count).toBeNull();
  });

  it('counts faster at a faster tempo', () => {
    const { result } = renderHook(() => useCountIn(120));

    act(() => result.current.start());
    act(() => void vi.advanceTimersByTime(500));

    expect(result.current.count).toBe(2);
  });

  it('drops the count when playback is stopped mid-count', () => {
    const { result } = renderHook(() => useCountIn(60));

    act(() => result.current.start());
    act(() => result.current.clear());

    expect(result.current.count).toBeNull();

    // And no stale timer resurrects it afterwards.
    act(() => void vi.advanceTimersByTime(3000));
    expect(result.current.count).toBeNull();
  });
});

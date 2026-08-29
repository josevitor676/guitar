import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FretRangeControl } from './FretRangeControl';

describe('FretRangeControl', () => {
  it('calls onChange with an incremented range when "next" is clicked', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={7} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /pr[oó]ximo/i }));
    expect(onChange).toHaveBeenCalledWith(2, 8);
  });

  it('decrements down to fret 1 when starting above the floor', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={2} maxFret={8} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    expect(onChange).toHaveBeenCalledWith(1, 7);
  });

  it('stays at fret 1 (never fret 0) when already at the floor', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={7} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    expect(onChange).toHaveBeenCalledWith(1, 7);
  });
});

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

  it('calls onChange with a decremented range when "previous" is clicked, floored at fret 0', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={7} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /anterior/i }));
    expect(onChange).toHaveBeenCalledWith(0, 6);
  });
});

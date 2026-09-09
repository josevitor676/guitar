import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FretRangeControl } from './FretRangeControl';

describe('FretRangeControl', () => {
  it('shows which frets are on screen', () => {
    render(<FretRangeControl minFret={1} maxFret={12} onChange={vi.fn()} />);

    expect(screen.getByText('Casas 1-12')).toBeInTheDocument();
  });

  it('slides the window to the chosen first fret, keeping its width', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={12} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/primeira casa vis[ií]vel/i), { target: { value: '5' } });

    expect(onChange).toHaveBeenCalledWith(5, 16);
  });

  it('never slides past the end of the neck', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={1} maxFret={12} onChange={onChange} />);

    // A 12-fret window can start no later than fret 13 and still end on 24.
    const slider = screen.getByLabelText(/primeira casa vis[ií]vel/i);
    expect(slider).toHaveAttribute('max', '13');

    fireEvent.change(slider, { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith(13, 24);
  });

  it('never slides below the first fret', () => {
    const onChange = vi.fn();
    render(<FretRangeControl minFret={5} maxFret={16} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/primeira casa vis[ií]vel/i), { target: { value: '0' } });

    expect(onChange).toHaveBeenCalledWith(1, 12);
  });

  it('gives a narrow window more room to travel than a wide one', () => {
    const { rerender } = render(<FretRangeControl minFret={1} maxFret={5} onChange={vi.fn()} />);
    const narrow = screen.getByLabelText(/primeira casa vis[ií]vel/i).getAttribute('max');

    rerender(<FretRangeControl minFret={1} maxFret={12} onChange={vi.fn()} />);
    const wide = screen.getByLabelText(/primeira casa vis[ií]vel/i).getAttribute('max');

    expect(Number(narrow)).toBeGreaterThan(Number(wide));
  });
});

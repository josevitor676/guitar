import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PulseIndicator } from './PulseIndicator';

describe('PulseIndicator', () => {
  it('is dim when not playing', () => {
    render(<PulseIndicator currentPulse={0} isPlaying={false} />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-edge-soft');
  });

  it('is lit when playing', () => {
    render(<PulseIndicator currentPulse={2} isPlaying />);
    expect(screen.getByTestId('pulse-indicator')).toHaveClass('bg-accent');
  });
});

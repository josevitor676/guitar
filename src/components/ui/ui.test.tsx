import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from './Card';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { ProgressBar } from './ProgressBar';

describe('Card', () => {
  it('renders its children on the card surface', () => {
    render(<Card>conteúdo</Card>);
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('appends caller classes without dropping its own', () => {
    render(<Card className="mt-6">conteúdo</Card>);
    const card = screen.getByText('conteúdo');
    expect(card.className).toContain('bg-card');
    expect(card.className).toContain('mt-6');
  });
});

describe('Chip', () => {
  it('marks the active state so the accent styling can key off it', () => {
    render(<Chip active>Braço</Chip>);
    expect(screen.getByText('Braço')).toHaveAttribute('data-active', 'true');
  });

  it('is inactive by default', () => {
    render(<Chip>Braço</Chip>);
    expect(screen.getByText('Braço')).toHaveAttribute('data-active', 'false');
  });
});

describe('IconButton', () => {
  it('exposes its label to assistive technology and fires on click', () => {
    const onClick = vi.fn();
    render(
      <IconButton label="Tocar" onClick={onClick}>
        <span aria-hidden="true">▶</span>
      </IconButton>,
    );

    const button = screen.getByRole('button', { name: 'Tocar' });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('fills with the accent color in the primary variant', () => {
    render(
      <IconButton label="Tocar" variant="primary" onClick={() => {}}>
        <span aria-hidden="true">▶</span>
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Tocar' }).className).toContain('bg-accent');
  });
});

describe('ProgressBar', () => {
  it('reports its position through the progressbar role', () => {
    render(<ProgressBar value={11} max={58} label="Progresso do exercício" />);

    const bar = screen.getByRole('progressbar', { name: 'Progresso do exercício' });
    expect(bar).toHaveAttribute('aria-valuenow', '11');
    expect(bar).toHaveAttribute('aria-valuemax', '58');
  });

  it('stays at zero width when there is nothing to play', () => {
    render(<ProgressBar value={0} max={0} label="Progresso do exercício" />);

    const bar = screen.getByRole('progressbar', { name: 'Progresso do exercício' });
    expect(bar.firstElementChild).toHaveStyle({ width: '0%' });
  });
});

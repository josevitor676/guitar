import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const TABS = [
  { id: 'practice', label: 'Prática / Fretboard Livre' },
  { id: 'exercises', label: 'Exercícios', badge: 4 },
];

describe('Tabs', () => {
  it('renders every tab label', () => {
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Prática \/ Fretboard Livre/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Exerc[ií]cios/ })).toBeInTheDocument();
  });

  it('renders the zero-padded badge count when provided', () => {
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={vi.fn()} />);
    expect(screen.getByText('04')).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={TABS} activeTabId="exercises" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Exerc[ií]cios/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Prática \/ Fretboard Livre/ })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /Exerc[ií]cios/ }));
    expect(onChange).toHaveBeenCalledWith('exercises');
  });
});

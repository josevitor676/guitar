import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from './Tabs';

const TABS = [
  { id: 'practice', label: 'Prática' },
  { id: 'exercises', label: 'Exercícios' },
];

describe('Tabs', () => {
  it('renders every tab label', () => {
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Prática' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Exercícios' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<Tabs tabs={TABS} activeTabId="exercises" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Exercícios' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Prática' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked tab id', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={TABS} activeTabId="practice" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Exercícios' }));
    expect(onChange).toHaveBeenCalledWith('exercises');
  });
});

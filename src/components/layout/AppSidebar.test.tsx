import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useUiStore } from '../../state/ui-store';
import { AppSidebar } from './AppSidebar';

describe('AppSidebar', () => {
  beforeEach(() => {
    useUiStore.setState({ activeTab: 'practice' });
  });

  it('renders both navigation items', () => {
    render(<AppSidebar />);
    expect(screen.getByRole('button', { name: 'Prática Livre' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exercícios' })).toBeInTheDocument();
  });

  it('marks the active tab as the current page', () => {
    render(<AppSidebar />);
    expect(screen.getByRole('button', { name: 'Prática Livre' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Exercícios' })).not.toHaveAttribute('aria-current', 'page');
  });

  it('switches tabs when a different item is clicked', () => {
    render(<AppSidebar />);
    fireEvent.click(screen.getByRole('button', { name: 'Exercícios' }));
    expect(useUiStore.getState().activeTab).toBe('exercises');
  });
});

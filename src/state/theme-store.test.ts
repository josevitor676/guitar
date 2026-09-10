import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore, THEME_STORAGE_KEY, readStoredTheme } from './theme-store';

describe('useThemeStore', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    useThemeStore.setState({ theme: 'dark' });
  });

  it('is dark until told otherwise', () => {
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('stamps the document when the light theme is chosen', () => {
    useThemeStore.getState().setTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  // Dark lives on the bare :root so the app is already dark before any script
  // runs; stamping it would only be a second way of saying the same thing.
  it('takes the stamp off again for dark', () => {
    useThemeStore.getState().setTheme('light');
    useThemeStore.getState().setTheme('dark');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('swaps between the two', () => {
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('light');
    useThemeStore.getState().toggleTheme();
    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('remembers the choice, since picking it every visit is not a choice', () => {
    useThemeStore.getState().setTheme('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
  });
});

describe('readStoredTheme', () => {
  beforeEach(() => localStorage.clear());

  it('reads back what was stored', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    expect(readStoredTheme()).toBe('light');
  });

  it('falls back to dark for nothing stored, or for nonsense', () => {
    expect(readStoredTheme()).toBe('dark');
    localStorage.setItem(THEME_STORAGE_KEY, 'neon');
    expect(readStoredTheme()).toBe('dark');
  });
});

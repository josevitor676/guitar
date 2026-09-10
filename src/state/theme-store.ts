import { create } from 'zustand';

export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'guitar-teacher:theme';

/**
 * The stored choice, or dark.
 *
 * Dark is the app's own look rather than a concession to the system: a
 * fretboard is read as a dark instrument, and the studio was designed that
 * way. Light exists for practising by a window, where a dark screen becomes a
 * mirror.
 */
export function readStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function stamp(theme: Theme): void {
  // Dark is what the bare :root already says, so it needs no attribute — and
  // leaving one off keeps the two ways of saying "dark" from disagreeing.
  if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
}

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',

  setTheme: (theme) => {
    stamp(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // A blocked storage costs the student the preference, not the switch.
    }
    set({ theme });
  },

  toggleTheme: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}));

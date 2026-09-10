import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../state/theme-store';

export function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const goingLight = theme === 'dark';

  return (
    <button
      type="button"
      // The label names what the press will do, not what is on now: a control
      // that announces the current state leaves the reader to guess the rest.
      aria-label={goingLight ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
      title={goingLight ? 'Tema claro' : 'Tema escuro'}
      onClick={toggleTheme}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-edge bg-surface text-text-secondary transition-all duration-200 hover:border-accent hover:text-accent"
    >
      {goingLight ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

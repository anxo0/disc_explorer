export type Theme = 'dark' | 'light';

export const THEME_KEY = 'disclens:theme';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** El tema oscuro es el predeterminado; la elección del usuario se recuerda. */
class ThemeStore {
  current = $state<Theme>(readTheme());

  toggle() {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme) {
    this.current = theme;
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // sin persistencia
    }
  }
}

export const theme = new ThemeStore();

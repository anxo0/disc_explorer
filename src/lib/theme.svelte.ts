export type Theme = 'dark' | 'light';

export const THEME_KEY = 'disclens:theme';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/** El tema oscuro es el predeterminado; la elección del usuario se recuerda. */
class ThemeStore {
  current = $state<Theme>(readTheme());

  toggle() {
    this.set(this.current === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme) {
    this.current = theme;
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b0c10' : '#fafafc');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // sin persistencia
    }
  }
}

export const theme = new ThemeStore();

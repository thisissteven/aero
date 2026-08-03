import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  const resolved = theme === 'system' ? getSystemTheme() : theme;

  // class based (Tailwind style)
  root.classList.toggle('dark', resolved === 'dark');

  // attribute based
  root.dataset.theme = resolved;

  return resolved;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? defaultTheme;
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    applyTheme(theme),
  );

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);

    localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  useEffect(() => {
    const update = () => {
      setResolvedTheme(applyTheme(theme));
    };

    update();

    if (theme !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    media.addEventListener('change', update);

    return () => {
      media.removeEventListener('change', update);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}

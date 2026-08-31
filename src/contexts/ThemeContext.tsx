import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: { id: Theme; name: string; description: string }[];
}

const themes = [
  { id: 'light' as Theme, name: 'Light', description: 'Clean and bright' },
  { id: 'dark' as Theme, name: 'Dark', description: 'Easy on the eyes' },
  { id: 'blue' as Theme, name: 'Ocean Blue', description: 'Calming blue tones' },
  { id: 'green' as Theme, name: 'Forest Green', description: 'Natural green hues' },
  { id: 'purple' as Theme, name: 'Royal Purple', description: 'Elegant purple shades' },
  { id: 'orange' as Theme, name: 'Sunset Orange', description: 'Warm orange tones' },
];

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('desmo-theme') as Theme;
    if (savedTheme && themes.some(t => t.id === savedTheme)) {
      setThemeState(savedTheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('light', 'dark', 'blue', 'green', 'purple', 'orange');

    // Add current theme class
    root.classList.add(theme);

    // Save to localStorage
    localStorage.setItem('desmo-theme', theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

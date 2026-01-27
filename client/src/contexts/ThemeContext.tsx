import { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { themes, defaultTheme, defaultThemeMode } from '../config/themes';
import type { ThemeName, Theme, ThemeMode } from '../config/themes';

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (themeName: ThemeName) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as ThemeName) || defaultTheme;
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode');
    return (saved as ThemeMode) || defaultThemeMode;
  });

  const theme = themes[themeName];
  const activeColors = theme.colors[themeMode];

  useEffect(() => {
    // Aplicar variables CSS al root
    const root = document.documentElement;
    Object.entries(activeColors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Generar variantes de color para compatibilidad con Tailwind
    const primary = activeColors.primary;
    const primaryDark = activeColors.primaryDark;

    // Función helper para mezclar colores (aproximación simple)
    const lighten = (color: string, amount: number) => {
      // Convertir hex a RGB
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      // Mezclar con blanco
      const newR = Math.round(r + (255 - r) * amount);
      const newG = Math.round(g + (255 - g) * amount);
      const newB = Math.round(b + (255 - b) * amount);

      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    };

    const darken = (color: string, amount: number) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);

      const newR = Math.round(r * (1 - amount));
      const newG = Math.round(g * (1 - amount));
      const newB = Math.round(b * (1 - amount));

      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    };

    // Generar variantes
    root.style.setProperty('--color-primary-50', lighten(primary, 0.95));
    root.style.setProperty('--color-primary-100', lighten(primary, 0.90));
    root.style.setProperty('--color-primary-200', lighten(primary, 0.80));
    root.style.setProperty('--color-primary-300', lighten(primary, 0.70));
    root.style.setProperty('--color-primary-400', lighten(primary, 0.50));
    root.style.setProperty('--color-primary-800', darken(primaryDark, 0.20));
    root.style.setProperty('--color-primary-900', darken(primaryDark, 0.40));

    // Guardar en localStorage
    localStorage.setItem('theme', themeName);
    localStorage.setItem('themeMode', themeMode);
  }, [activeColors, themeName, themeMode]);

  const handleSetTheme = (newTheme: ThemeName) => {
    setThemeName(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeName,
        setTheme: handleSetTheme,
        themeMode,
        setThemeMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

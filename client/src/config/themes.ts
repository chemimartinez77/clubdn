export type ThemeName = 'purple' | 'blue' | 'green' | 'red' | 'brown';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    hover: string;
    accent: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  purple: {
    name: 'purple',
    displayName: 'Púrpura',
    colors: {
      primary: '#9333ea',
      primaryDark: '#7e22ce',
      primaryLight: '#a855f7',
      background: '#0f0515',
      surface: '#1a0b2e',
      text: '#ffffff',
      textSecondary: '#d1d5db',
      border: '#4c1d95',
      hover: '#6b21a8',
      accent: '#c084fc',
    },
  },
  blue: {
    name: 'blue',
    displayName: 'Azul Corporativo',
    colors: {
      primary: '#1e40af',
      primaryDark: '#1e3a8a',
      primaryLight: '#3b82f6',
      background: '#0a1628',
      surface: '#1e293b',
      text: '#ffffff',
      textSecondary: '#cbd5e1',
      border: '#334155',
      hover: '#1d4ed8',
      accent: '#60a5fa',
    },
  },
  green: {
    name: 'green',
    displayName: 'Verde Elegante',
    colors: {
      primary: '#047857',
      primaryDark: '#065f46',
      primaryLight: '#10b981',
      background: '#0a1612',
      surface: '#1a2e23',
      text: '#ffffff',
      textSecondary: '#d1d5db',
      border: '#064e3b',
      hover: '#059669',
      accent: '#34d399',
    },
  },
  red: {
    name: 'red',
    displayName: 'Rojo Oscuro',
    colors: {
      primary: '#b91c1c',
      primaryDark: '#991b1b',
      primaryLight: '#dc2626',
      background: '#1a0a0a',
      surface: '#2d1515',
      text: '#ffffff',
      textSecondary: '#d1d5db',
      border: '#7f1d1d',
      hover: '#c92a2a',
      accent: '#f87171',
    },
  },
  brown: {
    name: 'brown',
    displayName: 'Marrón',
    colors: {
      primary: '#92400e',
      primaryDark: '#78350f',
      primaryLight: '#b45309',
      background: '#120c05',
      surface: '#231a0f',
      text: '#ffffff',
      textSecondary: '#d1d5db',
      border: '#713f12',
      hover: '#a16207',
      accent: '#fbbf24',
    },
  },
};

export const defaultTheme: ThemeName = 'purple';

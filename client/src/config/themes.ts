export type ThemeName = 'purple' | 'blue' | 'green' | 'red' | 'brown' | 'black';

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    background: string;
    surface: string;
    cardBackground: string;
    cardBorder: string;
    inputBackground: string;
    inputBorder: string;
    inputText: string;
    modalBackground: string;
    tableHeader: string;
    tableRow: string;
    tableRowHover: string;
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
      cardBackground: '#1a0b2e',
      cardBorder: '#4c1d95',
      inputBackground: '#12071c',
      inputBorder: '#4c1d95',
      inputText: '#ffffff',
      modalBackground: '#1a0b2e',
      tableHeader: '#241042',
      tableRow: '#1a0b2e',
      tableRowHover: '#241042',
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
      cardBackground: '#1e293b',
      cardBorder: '#334155',
      inputBackground: '#0d1a2f',
      inputBorder: '#334155',
      inputText: '#ffffff',
      modalBackground: '#1e293b',
      tableHeader: '#263449',
      tableRow: '#1e293b',
      tableRowHover: '#263449',
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
      cardBackground: '#1a2e23',
      cardBorder: '#064e3b',
      inputBackground: '#0b1a14',
      inputBorder: '#064e3b',
      inputText: '#ffffff',
      modalBackground: '#1a2e23',
      tableHeader: '#223a2d',
      tableRow: '#1a2e23',
      tableRowHover: '#223a2d',
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
      cardBackground: '#2d1515',
      cardBorder: '#7f1d1d',
      inputBackground: '#1f0f0f',
      inputBorder: '#7f1d1d',
      inputText: '#ffffff',
      modalBackground: '#2d1515',
      tableHeader: '#3a1b1b',
      tableRow: '#2d1515',
      tableRowHover: '#3a1b1b',
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
      cardBackground: '#231a0f',
      cardBorder: '#713f12',
      inputBackground: '#161007',
      inputBorder: '#713f12',
      inputText: '#ffffff',
      modalBackground: '#231a0f',
      tableHeader: '#2e2215',
      tableRow: '#231a0f',
      tableRowHover: '#2e2215',
      text: '#ffffff',
      textSecondary: '#d1d5db',
      border: '#713f12',
      hover: '#a16207',
      accent: '#fbbf24',
    },
  },
  black: {
    name: 'black',
    displayName: 'Negro',
    colors: {
      primary: '#18181b',
      primaryDark: '#09090b',
      primaryLight: '#27272a',
      background: '#000000',
      surface: '#0a0a0a',
      cardBackground: '#0a0a0a',
      cardBorder: '#27272a',
      inputBackground: '#050505',
      inputBorder: '#27272a',
      inputText: '#ffffff',
      modalBackground: '#0a0a0a',
      tableHeader: '#141414',
      tableRow: '#0a0a0a',
      tableRowHover: '#141414',
      text: '#ffffff',
      textSecondary: '#a1a1aa',
      border: '#27272a',
      hover: '#3f3f46',
      accent: '#71717a',
    },
  },
};

export const defaultTheme: ThemeName = 'purple';

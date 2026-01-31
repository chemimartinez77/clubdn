export type ThemeName = 'purple' | 'blue' | 'green' | 'red' | 'brown' | 'black';
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
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
}

export interface Theme {
  name: ThemeName;
  displayName: string;
  colors: {
    light: ThemeColors;
    dark: ThemeColors;
  };
}

const lightBase = {
  background: '#f8fafc',
  surface: '#ffffff',
  cardBackground: '#ffffff',
  cardBorder: '#e5e7eb',
  inputBackground: '#ffffff',
  inputBorder: '#d1d5db',
  inputText: '#111827',
  modalBackground: '#ffffff',
  tableHeader: '#f3f4f6',
  tableRow: '#ffffff',
  tableRowHover: '#f9fafb',
  text: '#111827',
  textSecondary: '#4b5563',
  border: '#e5e7eb',
  hover: '#f3f4f6'
};

export const themes: Record<ThemeName, Theme> = {
  purple: {
    name: 'purple',
    displayName: 'Púrpura',
    colors: {
      light: {
        primary: '#9333ea',
        primaryDark: '#7e22ce',
        primaryLight: '#a855f7',
        accent: '#c084fc',
        ...lightBase
      },
      dark: {
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
        accent: '#c084fc'
      }
    }
  },
  blue: {
    name: 'blue',
    displayName: 'Azul Corporativo',
    colors: {
      light: {
        primary: '#1e40af',
        primaryDark: '#1e3a8a',
        primaryLight: '#3b82f6',
        accent: '#60a5fa',
        ...lightBase
      },
      dark: {
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
        accent: '#60a5fa'
      }
    }
  },
  green: {
    name: 'green',
    displayName: 'Verde Elegante',
    colors: {
      light: {
        primary: '#047857',
        primaryDark: '#065f46',
        primaryLight: '#10b981',
        accent: '#34d399',
        ...lightBase
      },
      dark: {
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
        accent: '#34d399'
      }
    }
  },
  red: {
    name: 'red',
    displayName: 'Rojo Oscuro',
    colors: {
      light: {
        primary: '#b91c1c',
        primaryDark: '#991b1b',
        primaryLight: '#dc2626',
        accent: '#f87171',
        ...lightBase
      },
      dark: {
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
        accent: '#f87171'
      }
    }
  },
  brown: {
    name: 'brown',
    displayName: 'Marrón',
    colors: {
      light: {
        primary: '#92400e',
        primaryDark: '#78350f',
        primaryLight: '#b45309',
        accent: '#fbbf24',
        ...lightBase
      },
      dark: {
        primary: '#d97706',
        primaryDark: '#b45309',
        primaryLight: '#f59e0b',
        background: '#1c1410',
        surface: '#2a1f1a',
        cardBackground: '#2a1f1a',
        cardBorder: '#4a3728',
        inputBackground: '#1c1410',
        inputBorder: '#4a3728',
        inputText: '#fef3c7',
        modalBackground: '#2a1f1a',
        tableHeader: '#352820',
        tableRow: '#2a1f1a',
        tableRowHover: '#3d2f24',
        text: '#fef3c7',
        textSecondary: '#d4b896',
        border: '#4a3728',
        hover: '#4a3728',
        accent: '#fbbf24'
      }
    }
  },
  black: {
    name: 'black',
    displayName: 'Negro',
    colors: {
      light: {
        primary: '#18181b',
        primaryDark: '#09090b',
        primaryLight: '#27272a',
        accent: '#71717a',
        ...lightBase
      },
      dark: {
        primary: '#5865f2',
        primaryDark: '#4752c4',
        primaryLight: '#7289da',
        background: '#1e1f22',
        surface: '#2b2d31',
        cardBackground: '#2b2d31',
        cardBorder: '#3f4147',
        inputBackground: '#1e1f22',
        inputBorder: '#3f4147',
        inputText: '#f2f3f5',
        modalBackground: '#2b2d31',
        tableHeader: '#313338',
        tableRow: '#2b2d31',
        tableRowHover: '#35373c',
        text: '#f2f3f5',
        textSecondary: '#b5bac1',
        border: '#3f4147',
        hover: '#404249',
        accent: '#949cf7'
      }
    }
  }
};

export const defaultTheme: ThemeName = 'purple';
export const defaultThemeMode: ThemeMode = 'light';

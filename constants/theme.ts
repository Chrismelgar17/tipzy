const darkTheme = {
  colors: {
    background: '#0B0B0F',
    card: '#14141A',
    cardElevated: '#1A1A22',
    purple: '#6C5CE7',
    purpleLight: '#8B7FF0',
    cyan: '#00D1FF',
    cyanLight: '#4DE3FF',
    success: '#00D9A3',
    warning: '#FFB800',
    error: '#FF6B6B',
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
      tertiary: 'rgba(255, 255, 255, 0.5)',
      inverse: '#0B0B0F',
    },
    border: 'rgba(255, 255, 255, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 32,
      fontWeight: '700' as const,
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '700' as const,
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 16,
    },
  },
};

const lightTheme = {
  colors: {
    background: '#FFFFFF',
    card: '#F8F9FA',
    cardElevated: '#FFFFFF',
    purple: '#6C5CE7',
    purpleLight: '#8B7FF0',
    cyan: '#00D1FF',
    cyanLight: '#4DE3FF',
    success: '#00D9A3',
    warning: '#FFB800',
    error: '#FF6B6B',
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    text: {
      primary: '#1A1A1A',
      secondary: 'rgba(26, 26, 26, 0.7)',
      tertiary: 'rgba(26, 26, 26, 0.5)',
      inverse: '#FFFFFF',
    },
    border: 'rgba(0, 0, 0, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  spacing: darkTheme.spacing,
  borderRadius: darkTheme.borderRadius,
  typography: darkTheme.typography,
};

export const themes = {
  dark: darkTheme,
  light: lightTheme,
};

export const theme = darkTheme; // Default theme for backward compatibility

export type Theme = typeof darkTheme;
export type ThemeMode = keyof typeof themes;
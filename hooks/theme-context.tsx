import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { themes, Theme, ThemeMode } from '@/constants/theme';

interface ThemeState {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  isLoading: boolean;
}

export const [ThemeProvider, useTheme] = createContextHook<ThemeState>(() => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const stored = await AsyncStorage.getItem('theme');
      if (stored && (stored === 'light' || stored === 'dark')) {
        setThemeMode(stored as ThemeMode);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = useCallback(async (mode: ThemeMode) => {
    try {
      setThemeMode(mode);
      await AsyncStorage.setItem('theme', mode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setTheme(newMode);
  }, [themeMode, setTheme]);

  return useMemo(() => ({
    theme: themes[themeMode],
    themeMode,
    toggleTheme,
    setTheme,
    isLoading,
  }), [themeMode, toggleTheme, setTheme, isLoading]);
});
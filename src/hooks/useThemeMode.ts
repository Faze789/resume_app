import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Appearance } from 'react-native';
import { settingsStorage } from '../services/storage/settings.storage';
import { lightTheme, darkTheme } from '../config/themes';
import type { AppTheme } from '../config/themes';

type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextType = {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  activeTheme: AppTheme;
  isDark: boolean;
};

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  setThemeMode: () => {},
  activeTheme: lightTheme,
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    settingsStorage.get().then((settings) => {
      const mode = settings.theme_mode || 'light';
      setThemeModeState(mode);
      setIsDark(resolveIsDark(mode));
    });
  }, []);

  // Listen for system theme changes when mode is 'system'
  useEffect(() => {
    if (themeMode !== 'system') return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDark(colorScheme === 'dark');
    });
    return () => sub.remove();
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setIsDark(resolveIsDark(mode));
    settingsStorage.update({ theme_mode: mode });
  }, []);

  const activeTheme = isDark ? darkTheme : lightTheme;

  const value: ThemeContextType = { themeMode, setThemeMode, activeTheme, isDark };

  return React.createElement(ThemeContext.Provider, { value }, children);
}

export function useThemeMode(): ThemeContextType {
  return useContext(ThemeContext);
}

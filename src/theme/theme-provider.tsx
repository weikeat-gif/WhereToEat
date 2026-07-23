import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  type ResolvedThemeMode,
  type ThemeMode,
  themeColors,
} from '@/theme/tokens';

const STORAGE_KEY = 'makanmana.theme-mode';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  colors: (typeof themeColors)[ResolvedThemeMode];
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemMode = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((savedMode) => {
      if (savedMode === 'system' || savedMode === 'light' || savedMode === 'dark') {
        setModeState(savedMode);
      }
    });
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    setModeState(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode);
  }, []);

  const resolvedMode: ResolvedThemeMode =
    mode === 'system' ? (systemMode === 'dark' ? 'dark' : 'light') : mode;

  const value = useMemo(
    () => ({
      mode,
      resolvedMode,
      colors: themeColors[resolvedMode],
      setMode,
    }),
    [mode, resolvedMode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return context;
}

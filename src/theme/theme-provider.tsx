import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  const userSelectedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY)
      .then((savedMode) => {
        if (
          active &&
          !userSelectedRef.current &&
          (savedMode === 'system' ||
            savedMode === 'light' ||
            savedMode === 'dark')
        ) {
          setModeState(savedMode);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: ThemeMode) => {
    userSelectedRef.current = true;
    setModeState(nextMode);
    await AsyncStorage.setItem(STORAGE_KEY, nextMode).catch(() => undefined);
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

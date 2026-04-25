import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import { tokensFor, type ThemeMode, type ThemeTokens } from './tokens';

export type AppearancePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = '@runclub:appearance';

interface ThemeContextValue {
  preference: AppearancePreference;
  resolvedMode: ThemeMode;
  tokens: ThemeTokens;
  setPreference: (pref: AppearancePreference) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  resolvedMode: 'dark',
  tokens: tokensFor('dark'),
  setPreference: () => {},
  isDark: true,
});

/**
 * Persists the user's appearance preference (light / dark / system) and
 * resolves it against the system color scheme to produce a concrete mode +
 * tokens for the rest of the app to consume via `useTheme()`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>('system');

  // Hydrate from storage on mount. We don't block render — the default
  // ('system') is fine for the first paint.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          setPreferenceState(stored);
        }
      })
      .catch(() => undefined);
  }, []);

  const setPreference = useCallback((pref: AppearancePreference) => {
    setPreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => undefined);
  }, []);

  const resolvedMode: ThemeMode = useMemo(() => {
    if (preference === 'system') return systemScheme === 'light' ? 'light' : 'dark';
    return preference;
  }, [preference, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedMode,
      tokens: tokensFor(resolvedMode),
      setPreference,
      isDark: resolvedMode === 'dark',
    }),
    [preference, resolvedMode, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

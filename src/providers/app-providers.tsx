import type { PropsWithChildren } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import {
  FoodPreferencesProvider,
  useFoodPreferences,
} from '@/features/food-preferences/food-preferences-provider';
import { SavedPlacesProvider } from '@/features/saved/use-saved-places';
import { SearchProvider } from '@/features/search/search-provider';
import { AppThemeProvider } from '@/theme/theme-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <FoodPreferencesProvider>
          <SavedPlacesProvider>
            <AccountSearchProvider>{children}</AccountSearchProvider>
          </SavedPlacesProvider>
        </FoodPreferencesProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function AccountSearchProvider({ children }: PropsWithChildren) {
  const { isLoading: authLoading, user } = useAuth();
  const { isLoading: preferencesLoading, preferenceKeys } =
    useFoodPreferences();
  return (
    <SearchProvider
      historyScope={authLoading ? null : user?.id ?? 'guest'}
      preferenceKeys={preferenceKeys}
      preferencesReady={!authLoading && !preferencesLoading}>
      {children}
    </SearchProvider>
  );
}

import type { PropsWithChildren } from 'react';

import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { SavedPlacesProvider } from '@/features/saved/use-saved-places';
import { SearchProvider } from '@/features/search/search-provider';
import { AppThemeProvider } from '@/theme/theme-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <SavedPlacesProvider>
          <AccountSearchProvider>{children}</AccountSearchProvider>
        </SavedPlacesProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

function AccountSearchProvider({ children }: PropsWithChildren) {
  const { isLoading, user } = useAuth();
  return (
    <SearchProvider historyScope={isLoading ? null : user?.id ?? 'guest'}>
      {children}
    </SearchProvider>
  );
}

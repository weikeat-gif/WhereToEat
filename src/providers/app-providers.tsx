import type { PropsWithChildren } from 'react';

import { AuthProvider } from '@/features/auth/auth-provider';
import { SavedPlacesProvider } from '@/features/saved/use-saved-places';
import { SearchProvider } from '@/features/search/search-provider';
import { AppThemeProvider } from '@/theme/theme-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <SavedPlacesProvider>
          <SearchProvider>{children}</SearchProvider>
        </SavedPlacesProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

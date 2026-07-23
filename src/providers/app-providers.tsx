import type { PropsWithChildren } from 'react';

import { AuthProvider } from '@/features/auth/auth-provider';
import { SearchProvider } from '@/features/search/search-provider';
import { AppThemeProvider } from '@/theme/theme-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <SearchProvider>{children}</SearchProvider>
      </AuthProvider>
    </AppThemeProvider>
  );
}

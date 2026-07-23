import {
  createContext,
  type PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from 'react';

import type { AppUser } from '@/contracts/auth';

type AuthContextValue = {
  user: AppUser | null;
  isLoading: boolean;
  setMockUser: (user: AppUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setMockUser] = useState<AppUser | null>(null);
  const value = useMemo(
    () => ({ user, isLoading: false, setMockUser }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

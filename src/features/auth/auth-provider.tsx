import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { AppUser } from '@/contracts/auth';
import { isSupabaseConfigured } from '@/services/supabase/client';
import { toUserMessage } from '@/services/supabase/errors';

import type { AuthGateway } from './auth-gateway';
import { defaultAuthGateway } from './supabase-auth-gateway';

type AuthContextValue = {
  user: AppUser | null;
  isLoading: boolean;
  isBusy: boolean;
  error: string | null;
  emailCodeSent: boolean;
  emailCodeAddress: string;
  backendMode: 'live' | 'mock';
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  requestEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  resetEmailCode: () => void;
  signOut: () => Promise<void>;
  clearError: () => void;
  setMockUser: (user: AppUser | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = PropsWithChildren<{
  gateway?: AuthGateway;
}>;

export function AuthProvider({
  children,
  gateway = defaultAuthGateway,
}: AuthProviderProps) {
  const [user, setMockUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCodeAddress, setEmailCodeAddress] = useState('');

  useEffect(() => {
    let active = true;
    let authEventSeen = false;
    const unsubscribe = gateway.subscribe((session) => {
      if (!active) return;
      authEventSeen = true;
      setMockUser(session?.user ?? null);
      setIsLoading(false);
    });

    gateway
      .restoreSession()
      .then((session) => {
        if (active && !authEventSeen) setMockUser(session?.user ?? null);
      })
      .catch((restoreError: unknown) => {
        if (active) setError(toUserMessage(restoreError));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [gateway]);

  const perform = useCallback(async <Result,>(
    operation: () => Promise<Result>,
  ): Promise<Result> => {
    setError(null);
    setIsBusy(true);
    try {
      return await operation();
    } catch (operationError) {
      const message = toUserMessage(operationError);
      setError(message);
      throw operationError;
    } finally {
      setIsBusy(false);
    }
  }, []);

  const signInWithGoogle = useCallback(
    () => perform(() => gateway.signInWithGoogle()),
    [gateway, perform],
  );
  const signInWithApple = useCallback(
    () => perform(() => gateway.signInWithApple()),
    [gateway, perform],
  );
  const requestEmailCode = useCallback(
    async (email: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      await perform(() => gateway.requestEmailCode(normalizedEmail));
      setEmailCodeAddress(normalizedEmail);
      setEmailCodeSent(true);
    },
    [gateway, perform],
  );
  const verifyEmailCode = useCallback(
    (email: string, code: string) =>
      perform(() => gateway.verifyEmailCode(email, code)),
    [gateway, perform],
  );
  const updateDisplayName = useCallback(
    async (displayName: string) => {
      const updatedUser = await perform(() =>
        gateway.updateDisplayName(displayName),
      );
      setMockUser(updatedUser);
    },
    [gateway, perform],
  );
  const signOut = useCallback(async () => {
    await perform(() => gateway.signOut());
    setEmailCodeSent(false);
    setEmailCodeAddress('');
  }, [gateway, perform]);
  const resetEmailCode = useCallback(() => {
    setEmailCodeSent(false);
    setEmailCodeAddress('');
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isBusy,
      error,
      emailCodeSent,
      emailCodeAddress,
      backendMode: isSupabaseConfigured ? ('live' as const) : ('mock' as const),
      signInWithGoogle,
      signInWithApple,
      requestEmailCode,
      verifyEmailCode,
      updateDisplayName,
      resetEmailCode,
      signOut,
      clearError: () => setError(null),
      setMockUser,
    }),
    [
      emailCodeSent,
      emailCodeAddress,
      error,
      isBusy,
      isLoading,
      requestEmailCode,
      resetEmailCode,
      signInWithApple,
      signInWithGoogle,
      signOut,
      user,
      updateDisplayName,
      verifyEmailCode,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

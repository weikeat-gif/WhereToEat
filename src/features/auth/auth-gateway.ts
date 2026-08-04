import type { AppUser } from '@/contracts/auth';

export type AuthSession = {
  accessToken: string;
  user: AppUser;
};

export type AuthStateListener = (session: AuthSession | null) => void;

export interface AuthGateway {
  restoreSession(): Promise<AuthSession | null>;
  subscribe(listener: AuthStateListener): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithApple(): Promise<void>;
  requestEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
  updateDisplayName(displayName: string): Promise<AppUser>;
  deleteAccount(): Promise<void>;
  signOut(): Promise<void>;
}

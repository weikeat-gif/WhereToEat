import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { AppUser } from '@/contracts/auth';
import { BackendUnavailableError } from '@/services/supabase/errors';
import { supabase } from '@/services/supabase/client';

import { createAppleNonce } from './apple-nonce';
import type {
  AuthGateway,
  AuthSession,
  AuthStateListener,
} from './auth-gateway';

WebBrowser.maybeCompleteAuthSession();

function toAppUser(user: User): AppUser {
  const metadata = user.user_metadata;
  const displayName =
    metadata.full_name ?? metadata.name ?? metadata.display_name ?? undefined;
  const avatarUrl =
    metadata.avatar_url ?? metadata.picture ?? metadata.photo_url ?? undefined;

  return {
    id: user.id,
    email: user.email,
    displayName: typeof displayName === 'string' ? displayName : undefined,
    avatarUrl: typeof avatarUrl === 'string' ? avatarUrl : undefined,
  };
}

export function toAuthSession(session: Session | null): AuthSession | null {
  if (!session || session.user.is_anonymous) return null;
  return {
    accessToken: session.access_token,
    user: toAppUser(session.user),
  };
}

function requireClient() {
  if (!supabase) throw new BackendUnavailableError();
  return supabase;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export class SupabaseAuthGateway implements AuthGateway {
  async restoreSession(): Promise<AuthSession | null> {
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    throwIfError(error);
    return toAuthSession(data.session);
  }

  subscribe(listener: AuthStateListener): () => void {
    if (!supabase) return () => undefined;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      listener(toAuthSession(session));
    });
    return () => subscription.unsubscribe();
  }

  async signInWithGoogle(): Promise<void> {
    const client = requireClient();
    const redirectTo = makeRedirectUri({ scheme: 'makanmana', path: 'auth' });
    const { data, error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    throwIfError(error);
    if (!data.url) throw new Error('Google sign-in did not return a login URL.');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'cancel' || result.type === 'dismiss') {
      throw new Error('Google sign-in was cancelled.');
    }
    if (result.type !== 'success') {
      throw new Error('Google sign-in could not be completed.');
    }

    const code = new URL(result.url).searchParams.get('code');
    if (!code) throw new Error('Google sign-in response was missing its code.');
    const { error: exchangeError } =
      await client.auth.exchangeCodeForSession(code);
    throwIfError(exchangeError);
  }

  async signInWithApple(): Promise<void> {
    if (Platform.OS !== 'ios') {
      throw new Error('Apple sign-in is only available on iOS.');
    }
    if (!(await AppleAuthentication.isAvailableAsync())) {
      throw new Error('Apple sign-in is unavailable on this device.');
    }

    const client = requireClient();
    const nonce = createAppleNonce();
    const credential = await AppleAuthentication.signInAsync({
      nonce: nonce.hashed,
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) {
      throw new Error('Apple did not return an identity token.');
    }

    const { error } = await client.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: nonce.raw,
    });
    throwIfError(error);
  }

  async requestEmailCode(email: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    throwIfError(error);
  }

  async verifyEmailCode(email: string, code: string): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    throwIfError(error);
  }

  async signOut(): Promise<void> {
    const client = requireClient();
    const { error } = await client.auth.signOut();
    throwIfError(error);
  }
}

export const defaultAuthGateway = new SupabaseAuthGateway();

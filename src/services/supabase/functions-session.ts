import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/services/supabase/client';
import { BackendUnavailableError } from '@/services/supabase/errors';

type FunctionsAuthClient = {
  auth: {
    getSession: () => Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
    signInAnonymously: () => Promise<{
      data: { session: Session | null };
      error: { message: string } | null;
    }>;
  };
};

export function createFunctionsAccessTokenProvider(
  client: FunctionsAuthClient | null,
) {
  let pendingAnonymousSession: Promise<string> | null = null;

  return async function getFunctionsAccessToken(): Promise<string> {
    if (!client) throw new BackendUnavailableError();

    const { data, error } = await client.auth.getSession();
    if (error) throw new Error(error.message);
    if (data.session) return data.session.access_token;

    pendingAnonymousSession ??= client.auth
      .signInAnonymously()
      .then(({ data: anonymousData, error: anonymousError }) => {
        if (anonymousError) throw new Error(anonymousError.message);
        if (!anonymousData.session) {
          throw new Error('Anonymous guest session was not created.');
        }
        return anonymousData.session.access_token;
      })
      .finally(() => {
        pendingAnonymousSession = null;
      });

    return pendingAnonymousSession;
  };
}

export const getFunctionsAccessToken =
  createFunctionsAccessTokenProvider(supabase);

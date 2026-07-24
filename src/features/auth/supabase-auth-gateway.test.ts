import type { Session } from '@supabase/supabase-js';

import { toAuthSession } from './supabase-auth-gateway';

jest.mock('@/services/supabase/client', () => ({ supabase: null }));

describe('Supabase auth UI session mapping', () => {
  it('keeps the protected-search anonymous session in guest UI mode', () => {
    const session = {
      access_token: 'anonymous-user-jwt',
      user: {
        id: 'anonymous-user',
        is_anonymous: true,
        user_metadata: {},
      },
    } as Session;

    expect(toAuthSession(session)).toBeNull();
  });
});

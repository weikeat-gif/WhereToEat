const fileSystem = jest.requireActual('fs') as {
  readFileSync(path: string, encoding: string): string;
};

const sql = fileSystem
  .readFileSync(
    'supabase/migrations/202608040002_apple_auth_credentials.sql',
    'utf8',
  )
  .toLowerCase();

describe('private Apple credential storage', () => {
  it('cascades on account deletion and grants no client access', () => {
    expect(sql).toContain('references auth.users(id) on delete cascade');
    expect(sql).toContain('enable row level security');
    expect(sql).toContain(
      'revoke all on table public.apple_auth_credentials from anon, authenticated',
    );
    expect(sql).toContain('to service_role');
    expect(sql).not.toMatch(/grant\s+[^;]+\s+to\s+(anon|authenticated)/);
  });
});

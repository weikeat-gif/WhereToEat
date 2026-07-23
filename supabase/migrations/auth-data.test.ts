const fileSystem = jest.requireActual('fs') as {
  readFileSync(path: string, encoding: string): string;
};

const sql = fileSystem.readFileSync(
  'supabase/migrations/202607230001_auth_data.sql',
  'utf8',
).toLowerCase();

describe('auth/data migration', () => {
  it('enforces user ownership for saved place select, insert, and delete', () => {
    expect(sql).toContain('primary key (user_id, google_place_id)');
    expect(sql.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(3);
    expect(sql).toContain('for select');
    expect(sql).toContain('for insert');
    expect(sql).toContain('for delete');
    expect(sql).toContain('to authenticated');
  });

  it('exposes only current halal records and grants no client writes', () => {
    expect(sql).toContain('verified_at <= now() and expires_at > now()');
    expect(sql).toContain(
      'grant select on table public.halal_verifications to anon, authenticated',
    );
    expect(sql).not.toMatch(
      /grant\s+(insert|update|delete)[^;]*halal_verifications/,
    );
  });
});

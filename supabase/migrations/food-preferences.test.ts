const fileSystem = jest.requireActual('fs') as {
  readFileSync(path: string, encoding: string): string;
};

const sql = fileSystem
  .readFileSync(
    'supabase/migrations/202608040001_food_preferences.sql',
    'utf8',
  )
  .toLowerCase();

describe('food preferences migration', () => {
  it('uses one controlled key per user and grants no anonymous access', () => {
    expect(sql).toContain('primary key (user_id, preference_key)');
    expect(sql).toContain('references auth.users(id) on delete cascade');
    expect(sql).toContain("check (preference_key in (");
    expect(sql).toContain(
      'grant select, insert, delete on table public.food_preferences to authenticated',
    );
    expect(sql).not.toMatch(/grant[^;]*food_preferences[^;]*\bto anon\b/);
  });

  it('denies cross-account select, insert, and delete through RLS ownership', () => {
    expect(sql).toContain('alter table public.food_preferences enable row level security');
    expect(sql.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(3);
    expect(sql).toContain('for select');
    expect(sql).toContain('for insert');
    expect(sql).toContain('for delete');
    expect(sql).toContain('with check ((select auth.uid()) = user_id)');
  });
});

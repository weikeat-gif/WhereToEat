const fileSystem = jest.requireActual('fs') as {
  readFileSync(path: string, encoding: string): string;
};

const authData = fileSystem
  .readFileSync('supabase/migrations/202607230001_auth_data.sql', 'utf8')
  .toLowerCase();
const promotions = fileSystem
  .readFileSync('supabase/migrations/202607270001_restaurant_promotions.sql', 'utf8')
  .toLowerCase();
const preferences = fileSystem
  .readFileSync('supabase/migrations/202608040001_food_preferences.sql', 'utf8')
  .toLowerCase();
const appleCredentials = fileSystem
  .readFileSync(
    'supabase/migrations/202608040002_apple_auth_credentials.sql',
    'utf8',
  )
  .toLowerCase();

describe('account deletion data ownership', () => {
  it('cascades every user-owned table from the verified auth user', () => {
    expect(authData).toMatch(/user_id uuid not null references auth\.users\(id\) on delete cascade/);
    expect(preferences).toMatch(/user_id uuid not null references auth\.users\(id\) on delete cascade/);
    expect(promotions).toMatch(/viewer_id uuid not null references auth\.users\(id\) on delete cascade/);
    expect(appleCredentials).toContain(
      'user_id uuid primary key references auth.users(id) on delete cascade',
    );
  });

  it('continues to scope saved places and preferences to auth.uid()', () => {
    expect(authData.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(3);
    expect(preferences.match(/\(select auth\.uid\(\)\) = user_id/g)).toHaveLength(3);
  });
});

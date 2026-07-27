const fileSystem = jest.requireActual('fs') as {
  readFileSync(path: string, encoding: string): string;
};

const sql = fileSystem
  .readFileSync(
    'supabase/migrations/202607270001_restaurant_promotions.sql',
    'utf8',
  )
  .toLowerCase();

describe('restaurant promotion pilot migration', () => {
  it('keeps campaigns and viewer identifiers private', () => {
    expect(sql).toContain(
      'alter table public.restaurant_promotions enable row level security',
    );
    expect(sql).toContain(
      'alter table public.promotion_events enable row level security',
    );
    expect(sql).toContain(
      'revoke all on table public.restaurant_promotions from anon, authenticated',
    );
    expect(sql).toContain(
      'revoke all on table public.promotion_events from anon, authenticated',
    );
  });

  it('records one authenticated profile view per active campaign', () => {
    expect(sql).toContain('create or replace function public.record_promotion_view');
    expect(sql).toContain('security definer');
    expect(sql).toContain('auth.uid()');
    expect(sql).toContain('on conflict do nothing');
    expect(sql).toContain('grant execute on function public.record_promotion_view');
    expect(sql).toContain('to authenticated');
    expect(sql).not.toMatch(/grant execute[^;]*record_promotion_view[^;]*to anon/);
  });
});

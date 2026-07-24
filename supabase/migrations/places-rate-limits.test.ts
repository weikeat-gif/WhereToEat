const fileSystem = jest.requireActual('fs') as {
  readFileSync(path: string, encoding: string): string;
};

const sql = fileSystem
  .readFileSync(
    'supabase/migrations/202607240001_places_rate_limits.sql',
    'utf8',
  )
  .toLowerCase();

describe('Places API durable rate-limit migration', () => {
  it('keeps buckets private and exposes only a service-role function', () => {
    expect(sql).toContain(
      'alter table public.places_rate_limits enable row level security',
    );
    expect(sql).toContain(
      'revoke all on table public.places_rate_limits from anon, authenticated',
    );
    expect(sql).toContain('security definer');
    expect(sql).toContain('set search_path =');
    expect(sql).toContain('to service_role');
    expect(sql).not.toMatch(/grant execute[^;]*to (anon|authenticated)/);
  });

  it('increments the counter atomically inside an upsert', () => {
    expect(sql).toContain('on conflict (bucket_key) do update');
    expect(sql).toContain('limits.request_count + 1');
    expect(sql).toContain('current_count <= p_request_limit');
    expect(sql).toContain("updated_at < current_time - interval '24 hours'");
  });
});

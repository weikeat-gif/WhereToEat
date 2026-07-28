const fileSystem = jest.requireActual('fs') as {
  readFileSync(path: string, encoding: string): string;
};

const sql = fileSystem
  .readFileSync(
    'supabase/migrations/202607280001_fix_places_rate_limit_timestamp.sql',
    'utf8',
  )
  .toLowerCase();

describe('Places API rate-limit timestamp fix', () => {
  it('uses an unambiguous timestamp variable in every comparison', () => {
    expect(sql).toContain('request_timestamp timestamptz := clock_timestamp()');
    expect(sql).not.toMatch(/\bcurrent_time\b/);
    expect(sql).toContain("updated_at < request_timestamp - interval '24 hours'");
    expect(sql).toMatch(
      /limits\.window_started_at <=\s+request_timestamp - make_interval/,
    );
  });
});

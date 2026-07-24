create table if not exists public.places_rate_limits (
  bucket_key text primary key check (length(bucket_key) between 1 and 128),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 1),
  updated_at timestamptz not null default now()
);

alter table public.places_rate_limits enable row level security;
revoke all on table public.places_rate_limits from anon, authenticated;

create or replace function public.consume_places_rate_limit(
  p_bucket_key text,
  p_request_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_count integer;
  current_time timestamptz := clock_timestamp();
begin
  if
    length(p_bucket_key) not between 1 and 128
    or p_request_limit not between 1 and 1000
    or p_window_seconds not between 1 and 86400
  then
    return false;
  end if;

  delete from public.places_rate_limits
  where updated_at < current_time - interval '24 hours';

  insert into public.places_rate_limits as limits (
    bucket_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_bucket_key, current_time, 1, current_time)
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when limits.window_started_at <=
        current_time - make_interval(secs => p_window_seconds)
      then current_time
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <=
        current_time - make_interval(secs => p_window_seconds)
      then 1
      else limits.request_count + 1
    end,
    updated_at = current_time
  returning request_count into current_count;

  return current_count <= p_request_limit;
end;
$$;

revoke all on function public.consume_places_rate_limit(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_places_rate_limit(
  text,
  integer,
  integer
) to service_role;

create index if not exists places_rate_limits_updated_idx
on public.places_rate_limits (updated_at);

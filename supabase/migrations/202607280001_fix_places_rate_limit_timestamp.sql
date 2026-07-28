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
  request_timestamp timestamptz := clock_timestamp();
begin
  if
    length(p_bucket_key) not between 1 and 128
    or p_request_limit not between 1 and 1000
    or p_window_seconds not between 1 and 86400
  then
    return false;
  end if;

  delete from public.places_rate_limits
  where updated_at < request_timestamp - interval '24 hours';

  insert into public.places_rate_limits as limits (
    bucket_key,
    window_started_at,
    request_count,
    updated_at
  )
  values (p_bucket_key, request_timestamp, 1, request_timestamp)
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when limits.window_started_at <=
        request_timestamp - make_interval(secs => p_window_seconds)
      then request_timestamp
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at <=
        request_timestamp - make_interval(secs => p_window_seconds)
      then 1
      else limits.request_count + 1
    end,
    updated_at = request_timestamp
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

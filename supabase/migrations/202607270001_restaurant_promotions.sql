create table if not exists public.restaurant_promotions (
  id uuid primary key default gen_random_uuid(),
  google_place_id text not null check (length(google_place_id) between 5 and 255),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  created_at timestamptz not null default now()
);

create table if not exists public.promotion_events (
  promotion_id uuid not null references public.restaurant_promotions(id)
    on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null default 'profile_view'
    check (event_type = 'profile_view'),
  created_at timestamptz not null default now(),
  primary key (promotion_id, viewer_id, event_type)
);

alter table public.restaurant_promotions enable row level security;
alter table public.promotion_events enable row level security;

revoke all on table public.restaurant_promotions from anon, authenticated;
revoke all on table public.promotion_events from anon, authenticated;
grant select on table public.restaurant_promotions to service_role;

create or replace function public.record_promotion_view(p_promotion_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into public.promotion_events (
    promotion_id,
    viewer_id,
    event_type
  )
  select promotions.id, auth.uid(), 'profile_view'
  from public.restaurant_promotions as promotions
  where
    promotions.id = p_promotion_id
    and promotions.starts_at <= now()
    and promotions.ends_at > now()
  on conflict do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count = 1;
end;
$$;

revoke all on function public.record_promotion_view(uuid)
from public, anon, authenticated;
grant execute on function public.record_promotion_view(uuid)
to authenticated;

create index if not exists restaurant_promotions_active_idx
on public.restaurant_promotions (google_place_id, starts_at, ends_at);

create index if not exists promotion_events_created_idx
on public.promotion_events (promotion_id, created_at);

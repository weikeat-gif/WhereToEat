create table if not exists public.saved_places (
  user_id uuid not null references auth.users(id) on delete cascade,
  google_place_id text not null check (length(trim(google_place_id)) between 1 and 255),
  created_at timestamptz not null default now(),
  primary key (user_id, google_place_id)
);

alter table public.saved_places enable row level security;

revoke all on table public.saved_places from anon, authenticated;
grant select, insert, delete on table public.saved_places to authenticated;

create policy "Users read their saved places"
on public.saved_places for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users save places for themselves"
on public.saved_places for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users remove their saved places"
on public.saved_places for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists saved_places_user_created_idx
on public.saved_places (user_id, created_at desc);

create table if not exists public.halal_verifications (
  google_place_id text not null,
  source_name text not null,
  source_url text not null check (source_url ~ '^https://'),
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  primary key (google_place_id, source_name),
  check (length(trim(google_place_id)) between 1 and 255),
  check (length(trim(source_name)) between 1 and 255),
  check (expires_at > verified_at)
);

alter table public.halal_verifications enable row level security;

revoke all on table public.halal_verifications from anon, authenticated;
grant select on table public.halal_verifications to anon, authenticated;

create policy "Public reads current trusted halal records"
on public.halal_verifications for select
to anon, authenticated
using (verified_at <= now() and expires_at > now());

create index if not exists halal_verifications_current_idx
on public.halal_verifications (google_place_id, expires_at);

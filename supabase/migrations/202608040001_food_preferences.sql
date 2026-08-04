create table if not exists public.food_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  preference_key text not null check (preference_key in (
    'halal-required',
    'vegetarian',
    'malaysian',
    'malay',
    'chinese',
    'indian',
    'noodles',
    'rice',
    'cafe-dessert',
    'spicy',
    'mild',
    'supper',
    'open-now'
  )),
  created_at timestamptz not null default now(),
  primary key (user_id, preference_key)
);

alter table public.food_preferences enable row level security;

revoke all on table public.food_preferences from anon, authenticated;
grant select, insert, delete on table public.food_preferences to authenticated;

create policy "Users read their food preferences"
on public.food_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users add food preferences for themselves"
on public.food_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users remove their food preferences"
on public.food_preferences for delete
to authenticated
using ((select auth.uid()) = user_id);

create index if not exists food_preferences_user_created_idx
on public.food_preferences (user_id, created_at desc);

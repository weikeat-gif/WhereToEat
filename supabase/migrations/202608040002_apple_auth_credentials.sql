create table if not exists public.apple_auth_credentials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.apple_auth_credentials enable row level security;

revoke all on table public.apple_auth_credentials from anon, authenticated;
grant select, insert, update, delete on table public.apple_auth_credentials to service_role;

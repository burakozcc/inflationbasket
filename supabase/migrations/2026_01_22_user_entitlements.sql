-- Create/ensure updated_at trigger function exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Table: user_entitlements
create table if not exists public.user_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_premium boolean not null default false,
  source text not null default 'google_play',
  product_id text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index
create index if not exists idx_user_entitlements_expires_at
  on public.user_entitlements (expires_at);

-- RLS
alter table public.user_entitlements enable row level security;

-- Allow users to read their own entitlement row
drop policy if exists "user_entitlements_select_own" on public.user_entitlements;
create policy "user_entitlements_select_own"
  on public.user_entitlements
  for select
  using (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies are created on purpose:
-- authenticated users cannot write; only service_role (Edge Function) should write.

-- updated_at trigger
drop trigger if exists handle_updated_at_user_entitlements on public.user_entitlements;
create trigger handle_updated_at_user_entitlements
  before update on public.user_entitlements
  for each row
  execute procedure public.handle_updated_at();

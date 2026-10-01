-- Phase 2: authenticated user profiles and role security.
-- Run through the Supabase SQL Editor or Supabase CLI migration workflow.

create type public.app_role as enum ('manager', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role public.app_role not null default 'staff',
  department text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Trusted application profile. Role changes are administrator-only.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;

-- A signed-in user can read only their own profile.
create policy "profiles_select_own"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

-- Only non-sensitive personal fields are granted for user updates. The role and
-- active state are deliberately excluded, so an API request cannot self-promote.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, department) on public.profiles to authenticated;

create policy "profiles_update_own_non_sensitive_fields"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Future migrations may use this helper for manager-only RLS policies.
create or replace function public.is_manager()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'manager' and is_active = true
  );
$$;

revoke all on function public.is_manager() from public;
grant execute on function public.is_manager() to authenticated;

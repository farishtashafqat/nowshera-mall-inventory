-- Phase 6 security: Auth creation alone must never grant application access.
create table public.pending_staff_invites (
  email text primary key,
  full_name text not null,
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.pending_staff_invites enable row level security;
revoke all on public.pending_staff_invites from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  assigned_role public.app_role := 'staff';
  account_is_active boolean := false;
begin
  if exists (
    select 1 from public.pending_manager_invites
    where lower(email) = lower(coalesce(new.email, ''))
  ) then
    assigned_role := 'manager';
    account_is_active := true;
    delete from public.pending_manager_invites
    where lower(email) = lower(coalesce(new.email, ''));
  elsif exists (
    select 1 from public.pending_staff_invites
    where lower(email) = lower(coalesce(new.email, ''))
  ) then
    account_is_active := true;
    delete from public.pending_staff_invites
    where lower(email) = lower(coalesce(new.email, ''));
  end if;

  insert into public.profiles (id, full_name, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    assigned_role,
    account_is_active
  );
  return new;
end;
$$;

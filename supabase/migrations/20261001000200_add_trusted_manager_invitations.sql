-- Phase 2 final improvement: manager invitations are staged by the backend's
-- service-role client, then consumed only by the auth.users creation trigger.

create table public.pending_manager_invites (
  email text primary key,
  full_name text not null,
  invited_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.pending_manager_invites enable row level security;
revoke all on public.pending_manager_invites from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  assigned_role public.app_role := 'staff';
begin
  -- Only a pre-existing, private pending invitation can promote the new user.
  -- Browser metadata and the public profile table are never role authorities.
  if exists (
    select 1 from public.pending_manager_invites
    where lower(email) = lower(coalesce(new.email, ''))
  ) then
    assigned_role := 'manager';
    delete from public.pending_manager_invites
    where lower(email) = lower(coalesce(new.email, ''));
  end if;

  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, ''),
    assigned_role
  );
  return new;
end;
$$;

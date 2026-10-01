-- Staff accounts become active only after the invited person accepts the link.
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

create or replace function public.activate_staff_invitation()
returns public.profiles
language plpgsql
security definer set search_path = public
as $$
declare
  profile_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into profile_row from public.profiles where id = auth.uid() for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  -- Manager invites are already active. Returning here lets the same password
  -- setup page support their invite links without permitting a role change.
  if profile_row.is_active then
    return profile_row;
  end if;

  if profile_row.role <> 'staff' or not exists (
    select 1 from public.pending_staff_invites
    where lower(email) = lower(profile_row.email)
  ) then
    raise exception 'A valid staff invitation is required' using errcode = '42501';
  end if;

  update public.profiles set is_active = true where id = profile_row.id returning * into profile_row;
  delete from public.pending_staff_invites where lower(email) = lower(profile_row.email);
  return profile_row;
end;
$$;

grant execute on function public.activate_staff_invitation() to authenticated;

-- Add username editing support for the demo user management screen.
-- Run this once in Supabase SQL Editor if saving a changed username shows the RPC warning.

create or replace function update_user(
  p_caller_id uuid,
  p_id uuid,
  p_username text,
  p_display_name text,
  p_role text,
  p_permissions jsonb,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_username text := lower(btrim(coalesce(p_username, '')));
begin
  if not _is_admin(p_caller_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_username = '' then
    raise exception 'username_required' using errcode = '22023';
  end if;

  if v_username !~ '^[a-z0-9._-]+$' then
    raise exception 'invalid_username' using errcode = '22023';
  end if;

  if exists(select 1 from app_users where username = v_username and id <> p_id) then
    raise exception 'username_exists' using errcode = '23505';
  end if;

  update app_users
  set username     = v_username,
      display_name = coalesce(p_display_name, display_name),
      role         = coalesce(p_role, role),
      permissions  = coalesce(p_permissions, permissions),
      status       = coalesce(p_status, status),
      updated_at   = now()
  where id = p_id;

  return found;
end;
$$;

grant execute on function update_user(uuid,uuid,text,text,text,jsonb,text) to anon, authenticated;

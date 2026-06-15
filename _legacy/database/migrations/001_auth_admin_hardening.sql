create extension if not exists pgcrypto;

create type app_role as enum ('owner','admin','manager','b2b','sale_online','recruitment','viewer');
create type profile_status as enum ('active','blocked','inactive','pending_password_change');
create type audit_action as enum ('create','update','delete','restore','import','export','login','reset_password','permission_change');
create type notification_severity as enum ('low','medium','high','critical');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role app_role not null default 'viewer',
  department text,
  status profile_status default 'active',
  must_change_password boolean default false,
  failed_login_count int default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz,
  created_by uuid references profiles(id),
  updated_by uuid references profiles(id)
);

create table user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  module text not null check (module in ('dashboard','b2b','sale_online','recruitment','koc','user_management','audit_logs','settings')),
  can_view boolean default false,
  can_create boolean default false,
  can_update boolean default false,
  can_delete boolean default false,
  can_import boolean default false,
  can_export boolean default false,
  can_export_sensitive boolean default false,
  can_restore boolean default false,
  can_manage_users boolean default false,
  can_reset_password boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz,
  unique(user_id,module)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  user_email text,
  action audit_action not null,
  module text,
  table_name text,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  changed_fields jsonb,
  reason text,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

create table admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  module text,
  title text not null,
  message text not null,
  record_id uuid,
  actor_id uuid references profiles(id),
  actor_name text,
  target_user_id uuid references profiles(id),
  severity notification_severity default 'low',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table import_jobs (
  id uuid primary key default gen_random_uuid(),
  module text not null,
  file_name text,
  sheet_name text,
  row_count int default 0,
  success_count int default 0,
  error_count int default 0,
  status text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  error_log jsonb
);

create table rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  action text not null,
  ip_address text,
  user_id uuid references profiles(id),
  created_at timestamptz default now()
);

create index idx_profiles_role on profiles(role);
create index idx_profiles_status on profiles(status);
create index idx_profiles_email on profiles(email);
create index idx_user_permissions_user_module on user_permissions(user_id,module);
create index idx_audit_logs_module_created on audit_logs(module,created_at desc);
create index idx_audit_logs_record on audit_logs(table_name, record_id, created_at desc);
create index idx_notifications_read_created on admin_notifications(is_read,created_at desc);
create index idx_rate_limit_key_action_created on rate_limit_events(key,action,created_at desc);

create or replace function current_profile_role()
returns app_role
language sql security definer set search_path=public as $$
  select role
  from profiles
  where id = (select auth.uid())
    and status = 'active'
$$;

create or replace function is_owner_admin()
returns boolean
language sql security definer set search_path=public as $$
  select coalesce(current_profile_role() in ('owner','admin'), false)
$$;

create or replace function can_perm(module_name text, action_name text)
returns boolean
language sql security definer set search_path=public as $$
  select is_owner_admin()
  or exists (
    select 1
    from user_permissions p
    join profiles pr on pr.id = p.user_id
    where p.user_id = (select auth.uid())
      and pr.status = 'active'
      and p.module = module_name
      and case action_name
        when 'view' then p.can_view
        when 'create' then p.can_create
        when 'update' then p.can_update
        when 'delete' then p.can_delete
        when 'import' then p.can_import
        when 'export' then p.can_export
        when 'export_sensitive' then p.can_export_sensitive
        when 'restore' then p.can_restore
        when 'manage_users' then p.can_manage_users
        when 'reset_password' then p.can_reset_password
        else false
      end
  )
$$;

create or replace function protect_owner_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role app_role;
  actor_id uuid;
begin
  actor_id := auth.uid();

  select role into actor_role
  from profiles
  where id = actor_id;

  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      raise exception 'Owner cannot be deleted';
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if actor_id = old.id and old.role is distinct from new.role then
      raise exception 'Users cannot change their own role';
    end if;

    if old.role = 'owner' and actor_role is distinct from 'owner' then
      raise exception 'Only owner can modify owner profiles';
    end if;

    if new.role = 'owner' and actor_role is distinct from 'owner' then
      raise exception 'Only owner can assign owner role';
    end if;

    return new;
  end if;

  return new;
end;
$$;

create trigger trg_protect_owner_profile
before update or delete on profiles
for each row execute function protect_owner_profile();

create or replace function protect_owner_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role app_role;
  actor_id uuid;
  target_user_id uuid;
  target_role app_role;
begin
  actor_id := auth.uid();
  target_user_id := coalesce(new.user_id, old.user_id);

  select role into actor_role from profiles where id = actor_id;
  select role into target_role from profiles where id = target_user_id;

  if target_role = 'owner' and actor_role is distinct from 'owner' then
    raise exception 'Only owner can modify owner permissions';
  end if;

  if actor_id = target_user_id and actor_role is distinct from 'owner' then
    raise exception 'Users cannot modify their own permissions';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_protect_owner_permissions
before insert or update or delete on user_permissions
for each row execute function protect_owner_permissions();

alter table profiles enable row level security;
alter table user_permissions enable row level security;
alter table audit_logs enable row level security;
alter table admin_notifications enable row level security;
alter table import_jobs enable row level security;
alter table rate_limit_events enable row level security;

create policy profiles_select on profiles
for select to authenticated
using (id = (select auth.uid()) or is_owner_admin());

create policy profiles_admin_insert on profiles
for insert to authenticated
with check (is_owner_admin());

create policy profiles_admin_update on profiles
for update to authenticated
using (is_owner_admin())
with check (is_owner_admin());

-- No profiles DELETE policy. Deleting users must go through owner-only server-side flow.

create policy permissions_select on user_permissions
for select to authenticated
using (user_id = (select auth.uid()) or is_owner_admin());

create policy permissions_admin_insert on user_permissions
for insert to authenticated
with check (is_owner_admin());

create policy permissions_admin_update on user_permissions
for update to authenticated
using (is_owner_admin())
with check (is_owner_admin());

create policy permissions_admin_delete on user_permissions
for delete to authenticated
using (is_owner_admin());

create policy audit_select on audit_logs
for select to authenticated
using (is_owner_admin() or can_perm('audit_logs','view'));

-- Audit logs are written by server-side code. No authenticated insert/update/delete policy.

create policy notifications_select_owner_admin on admin_notifications
for select to authenticated
using (is_owner_admin());

create policy notifications_mark_read_owner_admin on admin_notifications
for update to authenticated
using (is_owner_admin())
with check (is_owner_admin());

create policy import_jobs_select on import_jobs
for select to authenticated
using (is_owner_admin() or can_perm(module,'import'));

create policy import_jobs_insert on import_jobs
for insert to authenticated
with check (is_owner_admin() or can_perm(module,'import'));

-- rate_limit_events is server-side only. Do not add anon/authenticated policies.

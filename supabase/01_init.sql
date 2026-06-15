-- ════════════════════════════════════════════════════════════════
-- MARKETING-DTP — Schema Phase 1 (auth + KV blob sync)
-- Paste vào Supabase → SQL Editor → New query → Run
-- ════════════════════════════════════════════════════════════════

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;

-- ── USERS ────────────────────────────────────────────────────────
create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  display_name text not null,
  role text not null default 'viewer',
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── KV BLOB STORE (mỗi key localStorage = 1 row) ─────────────────
create table if not exists kv_stores (
  key text primary key,
  payload jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now(),
  updated_by uuid
);

-- ── AUDIT LOG ────────────────────────────────────────────────────
create table if not exists audit_log (
  id bigserial primary key,
  user_id uuid,
  username text,
  action text not null,
  target text,
  payload jsonb,
  created_at timestamptz default now()
);

-- ════════════════════════════════════════════════════════════════
-- RPC: AUTH
-- ════════════════════════════════════════════════════════════════

create or replace function verify_password(p_username text, p_password text)
returns table(id uuid, username text, display_name text, role text, permissions jsonb, status text)
language plpgsql security definer set search_path = public, extensions as $$
begin
  return query
  select u.id, u.username, u.display_name, u.role, u.permissions, u.status
  from app_users u
  where u.username = p_username
    and u.password_hash = crypt(p_password, u.password_hash)
    and u.status = 'active';
end;
$$;

-- helper: caller must be admin
create or replace function _is_admin(p_caller_id uuid) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists(select 1 from app_users where id = p_caller_id and role = 'admin' and status = 'active');
$$;

create or replace function list_users(p_caller_id uuid)
returns table(id uuid, username text, display_name text, role text, permissions jsonb, status text, created_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _is_admin(p_caller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
  select u.id, u.username, u.display_name, u.role, u.permissions, u.status, u.created_at
  from app_users u order by u.created_at desc;
end;
$$;

create or replace function create_user(p_caller_id uuid, p_username text, p_password text, p_display_name text, p_role text, p_permissions jsonb)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not _is_admin(p_caller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  insert into app_users(username, password_hash, display_name, role, permissions)
  values (p_username, crypt(p_password, gen_salt('bf')), p_display_name, coalesce(p_role,'viewer'), coalesce(p_permissions,'{}'::jsonb))
  returning id into v_id;
  insert into audit_log(user_id, username, action, target, payload)
  values (p_caller_id, (select username from app_users where id=p_caller_id), 'create_user', p_username, p_permissions);
  return v_id;
end;
$$;

create or replace function update_user(p_caller_id uuid, p_id uuid, p_display_name text, p_role text, p_permissions jsonb, p_status text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _is_admin(p_caller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  update app_users
  set display_name = coalesce(p_display_name, display_name),
      role         = coalesce(p_role, role),
      permissions  = coalesce(p_permissions, permissions),
      status       = coalesce(p_status, status),
      updated_at   = now()
  where id = p_id;
  return found;
end;
$$;

create or replace function reset_password(p_caller_id uuid, p_id uuid, p_new_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  -- admin có thể reset ai cũng được; user thường chỉ reset chính mình
  if not _is_admin(p_caller_id) and p_caller_id <> p_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update app_users set password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  where id = p_id;
  return found;
end;
$$;

create or replace function delete_user(p_caller_id uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _is_admin(p_caller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_caller_id = p_id then raise exception 'cannot delete self'; end if;
  delete from app_users where id = p_id;
  return found;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- RPC: KV STORE  (sync dữ liệu nghiệp vụ blob theo key localStorage)
-- ════════════════════════════════════════════════════════════════

create or replace function kv_get_all()
returns table(key text, payload jsonb, updated_at timestamptz)
language sql security definer set search_path = public, extensions as $$
  select key, payload, updated_at from kv_stores;
$$;

create or replace function kv_get(p_key text)
returns jsonb language sql security definer set search_path = public, extensions as $$
  select payload from kv_stores where key = p_key;
$$;

create or replace function kv_set(p_key text, p_payload jsonb, p_user_id uuid)
returns timestamptz language plpgsql security definer set search_path = public, extensions as $$
declare v_ts timestamptz;
begin
  insert into kv_stores(key, payload, updated_at, updated_by)
  values (p_key, p_payload, now(), p_user_id)
  on conflict (key) do update
    set payload = excluded.payload, updated_at = now(), updated_by = excluded.updated_by
  returning updated_at into v_ts;
  return v_ts;
end;
$$;

-- ════════════════════════════════════════════════════════════════
-- RLS — chặn truy cập bảng trực tiếp, ép qua RPC
-- ════════════════════════════════════════════════════════════════

alter table app_users enable row level security;
alter table kv_stores enable row level security;
alter table audit_log enable row level security;
-- không tạo policy nào → anon không SELECT/INSERT/UPDATE/DELETE trực tiếp được.
-- Chỉ các RPC có security definer mới truy cập được (đã có _is_admin guard).

-- Cấp execute RPC cho role anon (publishable key dùng vai trò anon)
grant execute on function verify_password(text,text) to anon, authenticated;
grant execute on function list_users(uuid) to anon, authenticated;
grant execute on function create_user(uuid,text,text,text,text,jsonb) to anon, authenticated;
grant execute on function update_user(uuid,uuid,text,text,jsonb,text) to anon, authenticated;
grant execute on function reset_password(uuid,uuid,text) to anon, authenticated;
grant execute on function delete_user(uuid,uuid) to anon, authenticated;
grant execute on function kv_get_all() to anon, authenticated;
grant execute on function kv_get(text) to anon, authenticated;
grant execute on function kv_set(text,jsonb,uuid) to anon, authenticated;

-- ════════════════════════════════════════════════════════════════
-- SEED — các tài khoản hiện có trong code (password mặc định: 123456)
-- ════════════════════════════════════════════════════════════════

insert into app_users(username, password_hash, display_name, role, permissions) values
  ('admin',      crypt('123456', gen_salt('bf')), 'Admin / Owner',    'admin',       '{"dashboard":"full","b2b":"full","sale":"full","hr":"full","users":"full"}'::jsonb),
  ('ha',         crypt('123456', gen_salt('bf')), 'Hạ',                'editor',      '{"dashboard":"view","b2b":"import","sale":"import","hr":"import"}'::jsonb),
  ('hong',       crypt('123456', gen_salt('bf')), 'Hồng',              'b2b',         '{"dashboard":"view","b2b":"import"}'::jsonb),
  ('ngan',       crypt('123456', gen_salt('bf')), 'Ngân',              'sale_online', '{"dashboard":"view","sale":"import"}'::jsonb),
  ('viewer',     crypt('123456', gen_salt('bf')), 'Viewer',            'viewer',      '{"dashboard":"view"}'::jsonb),
  ('0346223877', crypt('123456', gen_salt('bf')), 'Dương Văn Hạ',      'sale_online', '{"dashboard":"view","sale":"import"}'::jsonb)
on conflict (username) do nothing;

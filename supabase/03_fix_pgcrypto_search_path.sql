-- Fix lỗi Supabase: function crypt(text, text) does not exist
-- Nguyên nhân: pgcrypto nằm trong schema extensions nhưng RPC security definer chỉ set search_path = public.
-- Cách dùng: Supabase Dashboard -> SQL Editor -> New query -> dán toàn bộ file này -> Run.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
set search_path = public, extensions;

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

create or replace function reset_password(p_caller_id uuid, p_id uuid, p_new_password text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
begin
  if not _is_admin(p_caller_id) and p_caller_id <> p_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update app_users set password_hash = crypt(p_new_password, gen_salt('bf')), updated_at = now()
  where id = p_id;
  return found;
end;
$$;

grant execute on function verify_password(text,text) to anon, authenticated;
grant execute on function create_user(uuid,text,text,text,text,jsonb) to anon, authenticated;
grant execute on function reset_password(uuid,uuid,text) to anon, authenticated;

-- Nếu tài khoản 0346223877 chưa có thì tạo mới. Nếu đã có thì giữ nguyên password hiện tại.
insert into app_users(username, password_hash, display_name, role, permissions)
values ('0346223877', crypt('123456', gen_salt('bf')), 'Dương Văn Hạ', 'sale_online', '{"dashboard":"view","sale":"import"}'::jsonb)
on conflict (username) do nothing;

-- Nếu test trả 0 dòng vì password hiện tại khác 123456, bỏ comment 2 dòng dưới để reset riêng tài khoản này:
-- update app_users set password_hash = crypt('123456', gen_salt('bf')), updated_at = now()
-- where username = '0346223877';

-- Test sau khi chạy: phải trả về 1 dòng nếu username/password đúng.
select id, username, display_name, role, status
from verify_password('0346223877', '123456');

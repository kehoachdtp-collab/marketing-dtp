-- ════════════════════════════════════════════════════════════════
-- MARKETING-DTP — Module Kịch bản (Scripts)
-- Chạy SAU 01_init.sql. Paste vào SQL Editor → Run.
-- ════════════════════════════════════════════════════════════════

create extension if not exists vector;        -- pgvector cho semantic similarity
create extension if not exists pg_trgm;       -- trigram cho text similarity fallback

-- ── SCRIPTS ──────────────────────────────────────────────────────
-- Status flow:
--   draft → ai_checking → ai_done → pending_review →
--   approved → assigned → filming → uploaded → aired →
--   (win|hieu_qua|nuoi|test|dung)
--   rejected, archived (terminal)
create table if not exists scripts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  content       text not null,
  product_code  text,                          -- liên kết sale_product_master.maSp (optional)
  campaign_code text,                          -- liên kết saleCamp.maCd
  hook          text,                          -- câu mở đầu
  call_to_action text,                         -- CTA cuối
  tags          text[] default '{}',
  status        text not null default 'draft',
  ai_score      int,                           -- 0..100
  ai_summary    text,
  ai_issues     jsonb default '[]'::jsonb,     -- [{type,severity,quote,suggestion},...]
  embedding     vector(1536),                  -- text-embedding-3-small dim
  reviewer_id   uuid references app_users(id),
  reviewed_at   timestamptz,
  review_note   text,
  rejected_reason text,
  created_by    uuid references app_users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_scripts_status on scripts(status);
create index if not exists idx_scripts_product on scripts(product_code);
create index if not exists idx_scripts_title_trgm on scripts using gin (title gin_trgm_ops);
create index if not exists idx_scripts_content_trgm on scripts using gin (content gin_trgm_ops);
create index if not exists idx_scripts_embedding on scripts using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── SCRIPT ASSIGNMENTS (1 kịch bản → N KOC) ──────────────────────
-- Status:
--   pending → filming → uploaded → aired → (win|hieu_qua|nuoi|test|dung)
--   cancelled
create table if not exists script_assignments (
  id             uuid primary key default gen_random_uuid(),
  script_id      uuid not null references scripts(id) on delete cascade,
  koc_code       text not null,                -- liên kết kocMst.maKoc
  status         text not null default 'pending',
  video_url      text,
  video_uploaded_at timestamptz,
  aired_at       timestamptz,
  performance_status text,                     -- WIN/HIEU_QUA/NUOI/TEST/DUNG
  orders         int default 0,
  gmv            numeric(18,2) default 0,
  note           text,
  assigned_by    uuid references app_users(id),
  assigned_at    timestamptz default now(),
  updated_at     timestamptz default now(),
  unique(script_id, koc_code)
);
create index if not exists idx_assignments_script on script_assignments(script_id);
create index if not exists idx_assignments_koc on script_assignments(koc_code);
create index if not exists idx_assignments_status on script_assignments(status);

-- ── AI CHECK HISTORY (mỗi lần re-check là 1 row) ─────────────────
create table if not exists script_ai_checks (
  id          uuid primary key default gen_random_uuid(),
  script_id   uuid not null references scripts(id) on delete cascade,
  engine      text not null default 'openai-gpt-4o-mini',
  prompt_tokens int, completion_tokens int, cost_usd numeric(10,6),
  score       int,
  summary     text,
  issues      jsonb default '[]'::jsonb,
  raw_response jsonb,
  created_at  timestamptz default now()
);
create index if not exists idx_ai_checks_script on script_ai_checks(script_id, created_at desc);

-- ════════════════════════════════════════════════════════════════
-- RPC
-- ════════════════════════════════════════════════════════════════

-- Tạo kịch bản (status='draft', chưa check)
create or replace function script_create(
  p_caller_id uuid,
  p_title text, p_content text,
  p_product_code text default null,
  p_campaign_code text default null,
  p_hook text default null, p_cta text default null,
  p_tags text[] default '{}'::text[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into scripts(title, content, product_code, campaign_code, hook, call_to_action, tags, created_by)
  values (p_title, p_content, p_product_code, p_campaign_code, p_hook, p_cta, coalesce(p_tags,'{}'::text[]), p_caller_id)
  returning id into v_id;
  insert into audit_log(user_id, action, target, payload)
  values (p_caller_id, 'script_create', v_id::text, jsonb_build_object('title', p_title));
  return v_id;
end; $$;

-- Cập nhật nội dung kịch bản (chỉ khi draft/rejected)
create or replace function script_update(
  p_caller_id uuid, p_id uuid,
  p_title text, p_content text, p_product_code text, p_campaign_code text,
  p_hook text, p_cta text, p_tags text[]
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select status into v_status from scripts where id = p_id;
  if v_status is null then return false; end if;
  if v_status not in ('draft','rejected','ai_done','pending_review') then
    raise exception 'cannot edit script in status %', v_status;
  end if;
  update scripts set
    title         = coalesce(p_title, title),
    content       = coalesce(p_content, content),
    product_code  = coalesce(p_product_code, product_code),
    campaign_code = coalesce(p_campaign_code, campaign_code),
    hook          = coalesce(p_hook, hook),
    call_to_action= coalesce(p_cta, call_to_action),
    tags          = coalesce(p_tags, tags),
    embedding     = case when p_content is not null and p_content <> content then null else embedding end,
    status        = case when p_content is not null and p_content <> content then 'draft' else status end,
    updated_at    = now()
  where id = p_id;
  return true;
end; $$;

-- Ghi kết quả AI check (gọi từ Edge Function)
create or replace function script_set_ai_result(
  p_id uuid,
  p_score int, p_summary text, p_issues jsonb,
  p_embedding vector,
  p_engine text,
  p_prompt_tokens int, p_completion_tokens int, p_cost_usd numeric,
  p_raw jsonb
) returns void language plpgsql security definer set search_path = public as $$
begin
  update scripts set
    ai_score   = p_score,
    ai_summary = p_summary,
    ai_issues  = coalesce(p_issues,'[]'::jsonb),
    embedding  = p_embedding,
    status     = 'pending_review',
    updated_at = now()
  where id = p_id;

  insert into script_ai_checks(script_id, engine, prompt_tokens, completion_tokens, cost_usd, score, summary, issues, raw_response)
  values (p_id, p_engine, p_prompt_tokens, p_completion_tokens, p_cost_usd, p_score, p_summary, p_issues, p_raw);
end; $$;

-- Approve / Reject (chỉ admin hoặc reviewer)
create or replace function script_approve(p_caller_id uuid, p_id uuid, p_note text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not _is_admin(p_caller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  update scripts set status='approved', reviewer_id=p_caller_id, reviewed_at=now(), review_note=p_note, updated_at=now()
  where id=p_id;
  insert into audit_log(user_id, action, target, payload) values (p_caller_id, 'script_approve', p_id::text, jsonb_build_object('note', p_note));
  return found;
end; $$;

create or replace function script_reject(p_caller_id uuid, p_id uuid, p_reason text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not _is_admin(p_caller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  update scripts set status='rejected', reviewer_id=p_caller_id, reviewed_at=now(), rejected_reason=p_reason, updated_at=now()
  where id=p_id;
  insert into audit_log(user_id, action, target, payload) values (p_caller_id, 'script_reject', p_id::text, jsonb_build_object('reason', p_reason));
  return found;
end; $$;

create or replace function script_archive(p_caller_id uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not _is_admin(p_caller_id) then raise exception 'forbidden' using errcode = '42501'; end if;
  update scripts set status='archived', updated_at=now() where id=p_id;
  return found;
end; $$;

-- Giao kịch bản cho 1 KOC
create or replace function script_assign(p_caller_id uuid, p_script_id uuid, p_koc_code text, p_note text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text;
begin
  select status into v_status from scripts where id = p_script_id;
  if v_status not in ('approved','assigned','filming','uploaded','aired') then
    raise exception 'script must be approved first (current: %)', v_status;
  end if;
  insert into script_assignments(script_id, koc_code, assigned_by, note)
  values (p_script_id, p_koc_code, p_caller_id, p_note)
  on conflict (script_id, koc_code) do update set assigned_at=now(), assigned_by=excluded.assigned_by, note=excluded.note, updated_at=now()
  returning id into v_id;
  update scripts set status='assigned', updated_at=now() where id=p_script_id and status='approved';
  insert into audit_log(user_id, action, target, payload) values (p_caller_id, 'script_assign', p_script_id::text, jsonb_build_object('koc', p_koc_code));
  return v_id;
end; $$;

-- Cập nhật trạng thái assignment (KOC đã quay/upload/air...)
create or replace function script_assignment_update(
  p_caller_id uuid, p_id uuid,
  p_status text, p_video_url text, p_performance_status text,
  p_orders int, p_gmv numeric, p_note text
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_script_id uuid;
begin
  select script_id into v_script_id from script_assignments where id = p_id;
  if v_script_id is null then return false; end if;
  update script_assignments set
    status            = coalesce(p_status, status),
    video_url         = coalesce(p_video_url, video_url),
    video_uploaded_at = case when p_status='uploaded' and video_uploaded_at is null then now() else video_uploaded_at end,
    aired_at          = case when p_status='aired'    and aired_at is null          then now() else aired_at end,
    performance_status= coalesce(p_performance_status, performance_status),
    orders            = coalesce(p_orders, orders),
    gmv               = coalesce(p_gmv, gmv),
    note              = coalesce(p_note, note),
    updated_at        = now()
  where id = p_id;
  -- propagate to script.status nếu ít nhất 1 assignment đã air
  update scripts s set status='aired', updated_at=now()
  where s.id = v_script_id
    and s.status in ('assigned','filming','uploaded')
    and exists (select 1 from script_assignments a where a.script_id = s.id and a.status='aired');
  return true;
end; $$;

-- ── LIST / SEARCH ───────────────────────────────────────────────
create or replace function script_list(p_status text default null)
returns table(
  id uuid, title text, status text, product_code text, campaign_code text,
  ai_score int, ai_issues jsonb,
  assignment_count bigint, aired_count bigint,
  created_by uuid, created_at timestamptz, updated_at timestamptz
) language sql security definer set search_path = public as $$
  select s.id, s.title, s.status, s.product_code, s.campaign_code,
         s.ai_score, s.ai_issues,
         (select count(*) from script_assignments a where a.script_id = s.id),
         (select count(*) from script_assignments a where a.script_id = s.id and a.status='aired'),
         s.created_by, s.created_at, s.updated_at
  from scripts s
  where (p_status is null or s.status = p_status)
  order by s.updated_at desc;
$$;

create or replace function script_get(p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'script', to_jsonb(s.*) - 'embedding',
    'assignments', coalesce((select jsonb_agg(to_jsonb(a.*) order by a.assigned_at desc) from script_assignments a where a.script_id = s.id), '[]'::jsonb),
    'ai_history', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'engine',c.engine,'score',c.score,'summary',c.summary,'issues',c.issues,'cost_usd',c.cost_usd,'created_at',c.created_at) order by c.created_at desc) from script_ai_checks c where c.script_id = s.id), '[]'::jsonb)
  )
  from scripts s where s.id = p_id;
$$;

-- Tìm kịch bản gần giống (semantic search bằng embedding)
create or replace function script_find_similar(p_id uuid, p_limit int default 5)
returns table(id uuid, title text, similarity real, status text)
language plpgsql security definer set search_path = public as $$
declare v_emb vector;
begin
  select embedding into v_emb from scripts where id = p_id;
  if v_emb is null then return; end if;
  return query
  select s.id, s.title, 1 - (s.embedding <=> v_emb) as similarity, s.status
  from scripts s
  where s.id <> p_id and s.embedding is not null
  order by s.embedding <=> v_emb
  limit p_limit;
end; $$;

-- ── RLS ──────────────────────────────────────────────────────────
alter table scripts             enable row level security;
alter table script_assignments  enable row level security;
alter table script_ai_checks    enable row level security;

grant execute on function script_create(uuid,text,text,text,text,text,text,text[]) to anon, authenticated;
grant execute on function script_update(uuid,uuid,text,text,text,text,text,text,text[]) to anon, authenticated;
grant execute on function script_set_ai_result(uuid,int,text,jsonb,vector,text,int,int,numeric,jsonb) to anon, authenticated;
grant execute on function script_approve(uuid,uuid,text) to anon, authenticated;
grant execute on function script_reject(uuid,uuid,text) to anon, authenticated;
grant execute on function script_archive(uuid,uuid) to anon, authenticated;
grant execute on function script_assign(uuid,uuid,text,text) to anon, authenticated;
grant execute on function script_assignment_update(uuid,uuid,text,text,text,int,numeric,text) to anon, authenticated;
grant execute on function script_list(text) to anon, authenticated;
grant execute on function script_get(uuid) to anon, authenticated;
grant execute on function script_find_similar(uuid,int) to anon, authenticated;

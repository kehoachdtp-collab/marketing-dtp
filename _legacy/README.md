# MKT Dashboard

NextJS + Supabase internal dashboard rebuild.

## Security Rules For Environment Files

AI/Claude/Codex tuyệt đối không được đọc, sửa, in nội dung, tóm tắt hoặc expose file `.env`, `.env.local`, `.env.production`.

Nếu cần biết biến môi trường, chỉ được đọc `.env.example`.

- Không commit `.env`, `.env.local`, `.env.production`.
- Không log biến môi trường ra console.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ được dùng server-side.
- Không dùng service role trong client component.
- Không đặt service role dưới `NEXT_PUBLIC_`.
- Không hardcode Supabase key trong code.
- Không paste nội dung `.env` vào chat, log, README hoặc issue.

## Current Phase

Auth/Admin foundation only.

KOC migration starts after Auth/Admin is stable.

## Current Status

- NextJS scaffold: done.
- Supabase Auth/Admin foundation: done.
- `.env.example`, `.gitignore`, README security rule: done.
- Auth/Admin migration: done.
- Owner seed script: prepared.
- KOC/business data migration: not started.
- Production deploy: not started.

## Next Step

Connect Supabase staging, run migration, seed owner, and test Auth/Admin end-to-end before migrating KOC/business modules.
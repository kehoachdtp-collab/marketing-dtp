import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type RateLimitOptions = {
  key: string;
  action: string;
  ipAddress?: string | null;
  userId?: string | null;
  maxAttempts: number;
  windowSeconds: number;
};

export async function checkAndRecordRateLimit(options: RateLimitOptions) {
  const admin = createAdminSupabaseClient();
  const since = new Date(Date.now() - options.windowSeconds * 1000).toISOString();

  const { count } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("key", options.key)
    .eq("action", options.action)
    .gte("created_at", since);

  if ((count ?? 0) >= options.maxAttempts) {
    return { limited: true, count: count ?? 0 };
  }

  await admin.from("rate_limit_events").insert({
    key: options.key,
    action: options.action,
    ip_address: options.ipAddress ?? null,
    user_id: options.userId ?? null,
  });

  return { limited: false, count: (count ?? 0) + 1 };
}

import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type NotificationInput = {
  type: string;
  module?: string | null;
  title: string;
  message: string;
  recordId?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  targetUserId?: string | null;
  severity?: "low" | "medium" | "high" | "critical";
};

export async function createAdminNotification(input: NotificationInput) {
  const admin = createAdminSupabaseClient();
  await admin.from("admin_notifications").insert({
    type: input.type,
    module: input.module ?? null,
    title: input.title,
    message: input.message,
    record_id: input.recordId ?? null,
    actor_id: input.actorId ?? null,
    actor_name: input.actorName ?? null,
    target_user_id: input.targetUserId ?? null,
    severity: input.severity ?? "low",
  });
}

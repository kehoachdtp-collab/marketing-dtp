import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AuditInput = {
  userId?: string | null;
  userEmail?: string | null;
  action: "create" | "update" | "delete" | "restore" | "import" | "export" | "login" | "reset_password" | "permission_change";
  module?: string | null;
  tableName?: string | null;
  recordId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  changedFields?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function logAudit(input: AuditInput) {
  const admin = createAdminSupabaseClient();
  await admin.from("audit_logs").insert({
    user_id: input.userId ?? null,
    user_email: input.userEmail ?? null,
    action: input.action,
    module: input.module ?? null,
    table_name: input.tableName ?? null,
    record_id: input.recordId ?? null,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    changed_fields: input.changedFields ?? null,
    reason: input.reason ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });
}

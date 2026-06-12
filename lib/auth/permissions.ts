import { redirect } from "next/navigation";
import { ModuleKey, PermissionAction } from "@/lib/auth/permission-presets";
import { requireActiveUser } from "@/lib/auth/require-user";

const permissionColumn: Record<PermissionAction, string> = {
  view: "can_view",
  create: "can_create",
  update: "can_update",
  delete: "can_delete",
  import: "can_import",
  export: "can_export",
  export_sensitive: "can_export_sensitive",
  restore: "can_restore",
  manage_users: "can_manage_users",
  reset_password: "can_reset_password",
};

export async function hasPermission(module: ModuleKey, action: PermissionAction) {
  const ctx = await requireActiveUser();
  if (ctx.profile.role === "owner" || ctx.profile.role === "admin") return { allowed: true, ctx };

  const { data } = await ctx.supabase
    .from("user_permissions")
    .select(permissionColumn[action])
    .eq("user_id", ctx.profile.id)
    .eq("module", module)
    .single<Record<string, boolean>>();

  return { allowed: Boolean(data?.[permissionColumn[action]]), ctx };
}

export async function requirePermission(module: ModuleKey, action: PermissionAction) {
  const result = await hasPermission(module, action);
  if (!result.allowed) redirect("/no-access");
  return result.ctx;
}

export async function requireRestorePermission(recordModule: ModuleKey) {
  await requirePermission("audit_logs", "view");
  return requirePermission(recordModule, "restore");
}

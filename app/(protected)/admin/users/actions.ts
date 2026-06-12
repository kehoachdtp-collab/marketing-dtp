"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit/log-audit";
import { isRole, isStatus, mergePermission, type ModuleKey } from "@/lib/auth/permission-presets";
import { validatePassword } from "@/lib/auth/password-policy";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminNotification } from "@/lib/notifications/admin-notifications";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function done(message: string): never {
  redirect("/admin/users?message=" + encodeURIComponent(message));
}

function fail(message: string): never {
  redirect("/admin/users?error=" + encodeURIComponent(message));
}

async function requestMeta() {
  const h = await headers();
  return {
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  };
}

async function getTargetProfile(admin: ReturnType<typeof createAdminSupabaseClient>, userId: string) {
  const { data: target } = await admin
    .from("profiles")
    .select("id,email,full_name,role,status,must_change_password")
    .eq("id", userId)
    .single();
  if (!target) fail("Không tìm thấy user.");
  return target;
}

function assertCanTouchTarget(actorRole: string, actorId: string, target: { id: string; role: string }, operation: "permissions" | "reset" | "lock" | "deactivate") {
  if (target.role === "owner" && actorRole !== "owner") {
    fail("Admin không được sửa/reset/khóa/xóa owner.");
  }
  if (operation === "permissions" && actorId === target.id && actorRole !== "owner") {
    fail("Không được tự đổi role/quyền của chính mình.");
  }
  if ((operation === "reset" || operation === "lock" || operation === "deactivate") && actorId === target.id) {
    fail("Vui lòng dùng luồng đổi mật khẩu/thiết lập tài khoản cá nhân thay vì thao tác admin trên chính mình.");
  }
}

export async function createUser(formData: FormData) {
  const ctx = await requirePermission("user_management", "manage_users");
  const admin = createAdminSupabaseClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "");
  const temporaryPassword = String(formData.get("temporary_password") || "");

  if (!email || !email.includes("@") || !isRole(role)) fail("Dữ liệu tạo user không hợp lệ.");
  if (role === "owner" && ctx.profile.role !== "owner") fail("Chỉ owner được tạo owner khác.");

  const passwordErrors = validatePassword(temporaryPassword);
  if (passwordErrors.length) fail(passwordErrors[0]);

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (authError || !authData.user) fail(authError?.message ?? "Không tạo được user auth.");

  const profileValue = {
    id: authData.user.id,
    email,
    full_name: fullName || null,
    role,
    status: "pending_password_change",
    must_change_password: true,
    created_by: ctx.profile.id,
    updated_by: ctx.profile.id,
  };

  const { error: profileError } = await admin.from("profiles").insert(profileValue);
  if (profileError) {
    await admin.auth.admin.deleteUser(authData.user.id);
    fail(profileError.message);
  }

  const meta = await requestMeta();
  await logAudit({
    userId: ctx.profile.id,
    userEmail: ctx.profile.email,
    action: "create",
    module: "user_management",
    tableName: "profiles",
    recordId: authData.user.id,
    newValue: { ...profileValue, temporary_password: "[temporary_password_hidden]" },
    reason: "create_user",
    ...meta,
  });

  await createAdminNotification({
    type: "permission_changed",
    module: "user_management",
    title: `Tạo user ${email}`,
    message: `${ctx.profile.email} đã tạo user mới. User bắt buộc đổi mật khẩu lần đầu.`,
    recordId: authData.user.id,
    actorId: ctx.profile.id,
    actorName: ctx.profile.full_name ?? ctx.profile.email,
    severity: "medium",
  });

  revalidatePath("/admin/users");
  done("Đã tạo user. User cần đổi mật khẩu ở lần đăng nhập đầu.");
}
export async function updateUserPermissions(formData: FormData) {
  const ctx = await requirePermission("user_management", "manage_users");
  const admin = createAdminSupabaseClient();
  const targetUserId = String(formData.get("user_id") || "");
  const fullName = String(formData.get("full_name") || "").trim();
  const role = String(formData.get("role") || "");
  const status = String(formData.get("status") || "");

  if (!targetUserId || !isRole(role) || !isStatus(status)) fail("Dữ liệu user không hợp lệ.");

  const target = await getTargetProfile(admin, targetUserId);
  assertCanTouchTarget(ctx.profile.role, ctx.profile.id, target, "permissions");

  if (role === "owner" && ctx.profile.role !== "owner") fail("Chỉ owner được cấp role owner.");
  if (target.role === "owner" && ctx.profile.role !== "owner") fail("Chỉ owner được thay đổi owner khác.");
  if (ctx.profile.id === target.id && target.role !== role) fail("Không được tự chuyển role của chính mình.");

  const modulePresetEntries: Array<[ModuleKey, string]> = [
    ["b2b", String(formData.get("perm_b2b") || "none")],
    ["sale_online", String(formData.get("perm_sale_online") || "none")],
    ["koc", String(formData.get("perm_sale_online") || "none")],
    ["recruitment", String(formData.get("perm_recruitment") || "none")],
    ["user_management", String(formData.get("perm_user_management") || "none")],
    ["audit_logs", String(formData.get("perm_audit_logs") || "none")],
  ];

  const hasAnyModule = modulePresetEntries.some(([module, preset]) => !["user_management", "audit_logs"].includes(module) && preset !== "none");
  modulePresetEntries.push(["dashboard", hasAnyModule ? "view" : "none"]);

  const upserts = modulePresetEntries.map(([module, preset]) => ({
    user_id: targetUserId,
    module,
    ...mergePermission(module, preset),
    updated_at: new Date().toISOString(),
  }));

  const { data: oldPermissions } = await admin.from("user_permissions").select("*").eq("user_id", targetUserId);
  const oldValue = { profile: target, permissions: oldPermissions ?? [] };

  await admin
    .from("profiles")
    .update({
      full_name: fullName || null,
      role,
      status,
      must_change_password: status === "pending_password_change" ? true : target.must_change_password,
      updated_at: new Date().toISOString(),
      updated_by: ctx.profile.id,
    })
    .eq("id", targetUserId);

  await admin.from("user_permissions").upsert(upserts, { onConflict: "user_id,module" });

  const { data: newProfile } = await admin.from("profiles").select("*").eq("id", targetUserId).single();
  const { data: newPermissions } = await admin.from("user_permissions").select("*").eq("user_id", targetUserId);
  const meta = await requestMeta();

  await logAudit({
    userId: ctx.profile.id,
    userEmail: ctx.profile.email,
    action: "permission_change",
    module: "user_management",
    tableName: "user_permissions",
    recordId: targetUserId,
    oldValue,
    newValue: { profile: newProfile, permissions: newPermissions ?? [] },
    reason: "admin_user_permission_update",
    ...meta,
  });

  await createAdminNotification({
    type: "permission_changed",
    module: "user_management",
    title: "Quyền user đã thay đổi",
    message: ctx.profile.email + " đã cập nhật quyền cho " + target.email + ".",
    actorId: ctx.profile.id,
    actorName: ctx.profile.full_name || ctx.profile.email,
    targetUserId,
    severity: "medium",
  });

  revalidatePath("/admin/users");
  done("Đã lưu quyền user.");
}

export async function resetUserPassword(formData: FormData) {
  const ctx = await requirePermission("user_management", "reset_password");
  const admin = createAdminSupabaseClient();
  const targetUserId = String(formData.get("user_id") || "");
  const temporaryPassword = String(formData.get("temporary_password") || "");
  if (!targetUserId) fail("Thiếu user cần reset.");

  const target = await getTargetProfile(admin, targetUserId);
  assertCanTouchTarget(ctx.profile.role, ctx.profile.id, target, "reset");

  const errors = validatePassword(temporaryPassword);
  if (errors.length) fail(errors.join(" "));

  const { error } = await admin.auth.admin.updateUserById(targetUserId, { password: temporaryPassword });
  if (error) fail("Không reset được mật khẩu.");

  await admin
    .from("profiles")
    .update({ status: "pending_password_change", must_change_password: true, updated_at: new Date().toISOString(), updated_by: ctx.profile.id })
    .eq("id", targetUserId);

  const meta = await requestMeta();
  await logAudit({
    userId: ctx.profile.id,
    userEmail: ctx.profile.email,
    action: "reset_password",
    module: "user_management",
    tableName: "profiles",
    recordId: targetUserId,
    reason: "admin_reset_password",
    ...meta,
  });
  await createAdminNotification({
    type: "reset_password",
    module: "user_management",
    title: "Reset mật khẩu user",
    message: ctx.profile.email + " đã reset mật khẩu cho " + target.email + ".",
    actorId: ctx.profile.id,
    actorName: ctx.profile.full_name || ctx.profile.email,
    targetUserId,
    severity: "high",
  });

  revalidatePath("/admin/users");
  done("Đã reset mật khẩu. User bắt buộc đổi mật khẩu ở lần đăng nhập tiếp theo.");
}

export async function toggleUserLock(formData: FormData) {
  const ctx = await requirePermission("user_management", "manage_users");
  const admin = createAdminSupabaseClient();
  const targetUserId = String(formData.get("user_id") || "");
  const target = await getTargetProfile(admin, targetUserId);
  assertCanTouchTarget(ctx.profile.role, ctx.profile.id, target, "lock");

  const nextStatus = target.status === "blocked" ? "active" : "blocked";
  await admin.from("profiles").update({ status: nextStatus, updated_at: new Date().toISOString(), updated_by: ctx.profile.id }).eq("id", targetUserId);

  const meta = await requestMeta();
  await logAudit({ userId: ctx.profile.id, userEmail: ctx.profile.email, action: "permission_change", module: "user_management", tableName: "profiles", recordId: targetUserId, oldValue: target, newValue: { status: nextStatus }, reason: "toggle_user_lock", ...meta });
  await createAdminNotification({ type: nextStatus === "blocked" ? "account_locked" : "permission_changed", module: "user_management", title: nextStatus === "blocked" ? "User bị khóa" : "User được mở khóa", message: ctx.profile.email + " đã đổi trạng thái " + target.email + " thành " + nextStatus + ".", actorId: ctx.profile.id, actorName: ctx.profile.full_name || ctx.profile.email, targetUserId, severity: nextStatus === "blocked" ? "high" : "medium" });

  revalidatePath("/admin/users");
  done("Đã cập nhật trạng thái user.");
}

export async function deactivateUser(formData: FormData) {
  const ctx = await requirePermission("user_management", "manage_users");
  const admin = createAdminSupabaseClient();
  const targetUserId = String(formData.get("user_id") || "");
  const target = await getTargetProfile(admin, targetUserId);
  assertCanTouchTarget(ctx.profile.role, ctx.profile.id, target, "deactivate");

  await admin.from("profiles").update({ status: "inactive", updated_at: new Date().toISOString(), updated_by: ctx.profile.id }).eq("id", targetUserId);
  const meta = await requestMeta();
  await logAudit({ userId: ctx.profile.id, userEmail: ctx.profile.email, action: "permission_change", module: "user_management", tableName: "profiles", recordId: targetUserId, oldValue: target, newValue: { status: "inactive" }, reason: "deactivate_user", ...meta });
  await createAdminNotification({ type: "permission_changed", module: "user_management", title: "User chuyển inactive", message: ctx.profile.email + " đã chuyển " + target.email + " sang inactive.", actorId: ctx.profile.id, actorName: ctx.profile.full_name || ctx.profile.email, targetUserId, severity: "medium" });

  revalidatePath("/admin/users");
  done("Đã chuyển user sang inactive.");
}

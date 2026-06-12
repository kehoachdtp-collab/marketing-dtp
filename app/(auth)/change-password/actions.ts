"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit/log-audit";
import { validatePassword } from "@/lib/auth/password-policy";
import { requireUser } from "@/lib/auth/require-user";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function changePasswordError(message: string): never {
  redirect("/change-password?error=" + encodeURIComponent(message));
}

export async function changePasswordAction(formData: FormData) {
  const ctx = await requireUser({ allowPendingPasswordChange: true });
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password !== confirmPassword) changePasswordError("Mật khẩu xác nhận không khớp.");
  const errors = validatePassword(password);
  if (errors.length) changePasswordError(errors.join(" "));

  const { error } = await ctx.supabase.auth.updateUser({ password });
  if (error) changePasswordError("Không đổi được mật khẩu. Vui lòng thử lại.");

  const admin = createAdminSupabaseClient();
  await admin
    .from("profiles")
    .update({
      status: "active",
      must_change_password: false,
      failed_login_count: 0,
      locked_until: null,
      updated_at: new Date().toISOString(),
      updated_by: ctx.profile.id,
    })
    .eq("id", ctx.profile.id);

  const h = await headers();
  await logAudit({
    userId: ctx.profile.id,
    userEmail: ctx.profile.email,
    action: "reset_password",
    module: "user_management",
    tableName: "profiles",
    recordId: ctx.profile.id,
    reason: "first_login_password_change",
    ipAddress: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
    userAgent: h.get("user-agent"),
  });

  redirect("/dashboard");
}

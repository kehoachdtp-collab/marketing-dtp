"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit/log-audit";
import { createAdminNotification } from "@/lib/notifications/admin-notifications";
import { checkAndRecordRateLimit } from "@/lib/security/rate-limit";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function loginError(message: string): never {
  redirect("/login?error=" + encodeURIComponent(message));
}

async function requestMeta() {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const userAgent = h.get("user-agent");
  return { ip, userAgent };
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const { ip, userAgent } = await requestMeta();

  if (!email || !password) loginError("Vui lòng nhập email và mật khẩu.");

  const loginLimit = await checkAndRecordRateLimit({
    key: email + ":" + (ip ?? "unknown"),
    action: "login",
    ipAddress: ip,
    maxAttempts: Number(process.env.RATE_LIMIT_LOGIN_MAX_ATTEMPTS || 10),
    windowSeconds: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_SECONDS || 900),
  });

  if (loginLimit.limited) {
    await logAudit({ action: "login", userEmail: email, reason: "rate_limited", ipAddress: ip, userAgent });
    await createAdminNotification({
      type: "login_failed",
      title: "Login bị rate limit",
      message: email + " bị chặn tạm thời do đăng nhập quá nhiều lần.",
      severity: "high",
    });
    loginError("Tài khoản/IP đang bị giới hạn đăng nhập. Vui lòng thử lại sau.");
  }

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id,email,full_name,role,status,must_change_password,failed_login_count,locked_until")
    .eq("email", email)
    .maybeSingle();

  const lockedUntil = profile?.locked_until ? new Date(profile.locked_until) : null;
  if (profile && (profile.status === "blocked" || profile.status === "inactive" || (lockedUntil && lockedUntil > new Date()))) {
    await logAudit({ userId: profile.id, userEmail: email, action: "login", reason: "account_locked_or_inactive", ipAddress: ip, userAgent });
    await createAdminNotification({
      type: "account_locked",
      title: "Tài khoản bị chặn đăng nhập",
      message: email + " cố đăng nhập khi tài khoản đang bị khóa hoặc inactive.",
      targetUserId: profile.id,
      severity: "high",
    });
    loginError("Tài khoản đang bị khóa hoặc không hoạt động.");
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    const nextCount = (profile?.failed_login_count ?? 0) + 1;
    if (profile) {
      const updates: Record<string, unknown> = { failed_login_count: nextCount };
      if (nextCount >= 5) updates.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      await admin.from("profiles").update(updates).eq("id", profile.id);
      if (nextCount >= 4) {
        await createAdminNotification({
          type: nextCount >= 5 ? "account_locked" : "login_failed",
          title: nextCount >= 5 ? "Tài khoản bị khóa 15 phút" : "Đăng nhập sai nhiều lần",
          message: email + " đăng nhập sai " + nextCount + " lần.",
          targetUserId: profile.id,
          severity: nextCount >= 5 ? "critical" : "medium",
        });
      }
    }
    await logAudit({ userId: profile?.id, userEmail: email, action: "login", reason: "invalid_credentials", ipAddress: ip, userAgent });
    loginError("Email hoặc mật khẩu không đúng.");
  }

  if (!profile) {
    await supabase.auth.signOut();
    await logAudit({ userId: data.user.id, userEmail: email, action: "login", reason: "missing_profile", ipAddress: ip, userAgent });
    loginError("Tài khoản chưa được cấp profile trong hệ thống.");
  }

  await admin
    .from("profiles")
    .update({ failed_login_count: 0, locked_until: null, last_login_at: new Date().toISOString() })
    .eq("id", profile.id);

  await logAudit({ userId: profile.id, userEmail: email, action: "login", reason: "success", ipAddress: ip, userAgent });

  if (profile.must_change_password || profile.status === "pending_password_change") {
    redirect("/change-password");
  }

  redirect("/dashboard");
}


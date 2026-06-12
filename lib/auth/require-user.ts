import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AppRole = "owner" | "admin" | "manager" | "b2b" | "sale_online" | "recruitment" | "viewer";
export type ProfileStatus = "active" | "blocked" | "inactive" | "pending_password_change";

export type CurrentProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  department: string | null;
  status: ProfileStatus;
  must_change_password: boolean;
  locked_until: string | null;
};

export async function getCurrentUserProfile() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,department,status,must_change_password,locked_until")
    .eq("id", user.id)
    .single<CurrentProfile>();

  if (!profile) return null;
  return { user, profile, supabase };
}

export async function requireUser(options: { allowPendingPasswordChange?: boolean } = {}) {
  const ctx = await getCurrentUserProfile();
  if (!ctx) redirect("/login");

  const lockedUntil = ctx.profile.locked_until ? new Date(ctx.profile.locked_until) : null;
  if (ctx.profile.status === "blocked" || ctx.profile.status === "inactive" || (lockedUntil && lockedUntil > new Date())) {
    await ctx.supabase.auth.signOut();
    redirect("/login?error=account-disabled");
  }

  const mustChange = ctx.profile.must_change_password || ctx.profile.status === "pending_password_change";
  if (mustChange && !options.allowPendingPasswordChange) {
    redirect("/change-password");
  }

  return ctx;
}

export async function requireActiveUser() {
  const ctx = await requireUser();
  if (ctx.profile.status !== "active" || ctx.profile.must_change_password) {
    redirect("/change-password");
  }
  return ctx;
}

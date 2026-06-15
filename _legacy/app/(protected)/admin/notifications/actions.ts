"use server";

import { revalidatePath } from "next/cache";
import { requireActiveUser } from "@/lib/auth/require-user";

export async function markNotificationRead(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { profile, supabase } = await requireActiveUser();
  if (profile.role !== "owner" && profile.role !== "admin") return;

  await supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("id", id);

  revalidatePath("/admin/notifications");
}
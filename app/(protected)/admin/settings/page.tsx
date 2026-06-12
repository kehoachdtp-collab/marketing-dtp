import { requirePermission } from "@/lib/auth/permissions";

export default async function SettingsPage() {
  await requirePermission("settings", "view");
  return <div className="card">Settings shell.</div>;
}

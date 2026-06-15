import { requirePermission } from "@/lib/auth/permissions";

export default async function DeletedRecordsPage() {
  await requirePermission("audit_logs", "view");
  return <div className="card">Deleted records shell. Hard delete không có trong UI thường.</div>;
}

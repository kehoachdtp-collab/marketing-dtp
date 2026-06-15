import { requirePermission } from "@/lib/auth/permissions";

export default async function RecruitmentPage() {
  await requirePermission("recruitment", "view");
  return <div className="card">Tuyển dụng shell. Chưa migrate module ở phase này.</div>;
}

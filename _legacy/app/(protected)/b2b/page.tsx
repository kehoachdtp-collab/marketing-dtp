import { requirePermission } from "@/lib/auth/permissions";

export default async function B2BPage() {
  await requirePermission("b2b", "view");
  return <div className="card">B2B shell. Chưa migrate module ở phase này.</div>;
}

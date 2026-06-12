import { requirePermission } from "@/lib/auth/permissions";

export default async function SalePage() {
  await requirePermission("sale_online", "view");
  return <div className="card">Sale Online shell. KOC sẽ migrate sau Auth/Admin.</div>;
}

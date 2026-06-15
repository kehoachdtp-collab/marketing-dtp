import { requirePermission } from "@/lib/auth/permissions";

export default async function DashboardPage() {
  await requirePermission("dashboard", "view");
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Tổng quan MKT</h1>
          <p className="page-subtitle">Auth/Admin foundation đã sẵn sàng cho bước migrate module.</p>
        </div>
      </div>
      <section className="card">
        Chưa migrate dữ liệu nghiệp vụ. KOC sẽ được migrate sau khi Auth/Admin chạy ổn.
      </section>
    </>
  );
}

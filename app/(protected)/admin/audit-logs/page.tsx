import { requirePermission } from "@/lib/auth/permissions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type AuditRow = {
  id: string;
  created_at: string;
  user_email: string | null;
  action: string;
  module: string;
  table_name: string | null;
  record_id: string | null;
  changed_fields: Record<string, unknown> | null;
  reason: string | null;
};

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function summarizeChanges(value: Record<string, unknown> | null) {
  if (!value || Object.keys(value).length === 0) return "-";
  return Object.keys(value).slice(0, 5).join(", ");
}

export default async function AuditLogsPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePermission("audit_logs", "view");
  const params = await searchParams;
  const moduleFilter = param(params, "module");
  const actionFilter = param(params, "action");
  const userFilter = param(params, "user");

  let query = ctx.supabase
    .from("audit_logs")
    .select("id,created_at,user_email,action,module,table_name,record_id,changed_fields,reason")
    .order("created_at", { ascending: false })
    .limit(100);

  if (moduleFilter) query = query.eq("module", moduleFilter);
  if (actionFilter) query = query.eq("action", actionFilter);
  if (userFilter) query = query.ilike("user_email", `%${userFilter}%`);

  const { data } = await query;
  const rows = (data ?? []) as AuditRow[];

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Lịch sử dữ liệu</h1>
          <p className="page-subtitle">Audit logs ghi nhận thao tác đăng nhập, phân quyền, reset mật khẩu và thay đổi dữ liệu.</p>
        </div>
      </div>

      <div className="card">
        <form className="filter-grid" method="get">
          <label className="field">
            <span>Module</span>
            <input name="module" defaultValue={moduleFilter} placeholder="sale_online" />
          </label>
          <label className="field">
            <span>Hành động</span>
            <input name="action" defaultValue={actionFilter} placeholder="update" />
          </label>
          <label className="field">
            <span>Người thao tác</span>
            <input name="user" defaultValue={userFilter} placeholder="email" />
          </label>
          <button className="btn primary" type="submit">Lọc</button>
        </form>

        <div className="table-wrap table-compact">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thao tác</th>
                <th>Module</th>
                <th>Hành động</th>
                <th>Bảng</th>
                <th>Record</th>
                <th>Nội dung thay đổi</th>
                <th>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{row.user_email ?? "-"}</td>
                  <td><span className="badge muted">{row.module}</span></td>
                  <td>{row.action}</td>
                  <td>{row.table_name ?? "-"}</td>
                  <td className="mono">{row.record_id ?? "-"}</td>
                  <td>{summarizeChanges(row.changed_fields)}</td>
                  <td>
                    <details>
                      <summary>Xem</summary>
                      <pre className="json-preview">{JSON.stringify(row.changed_fields ?? { reason: row.reason }, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={8} className="muted-text">Chưa có log phù hợp.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted-text">Khôi phục dữ liệu sẽ được nối ở phase migrate nghiệp vụ và luôn check kép: audit_logs.can_view + module gốc.can_restore.</p>
      </div>
    </>
  );
}
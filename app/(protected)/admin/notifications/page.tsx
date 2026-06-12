import { requireActiveUser } from "@/lib/auth/require-user";
import { markNotificationRead } from "./actions";

type NotificationRow = {
  id: string;
  type: string;
  module: string | null;
  title: string;
  message: string | null;
  actor_name: string | null;
  severity: string;
  is_read: boolean;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function severityClass(severity: string) {
  if (severity === "critical" || severity === "high") return "badge danger";
  if (severity === "medium") return "badge warn";
  return "badge muted";
}

export default async function NotificationsPage() {
  const { profile, supabase } = await requireActiveUser();
  if (profile.role !== "owner" && profile.role !== "admin") {
    return <div className="denied">Bạn không có quyền truy cập khu vực này.</div>;
  }

  const { data } = await supabase
    .from("admin_notifications")
    .select("id,type,module,title,message,actor_name,severity,is_read,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as NotificationRow[];
  const unreadCount = rows.filter((row) => !row.is_read).length;

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Phase 1 chỉ owner/admin xem thông báo thao tác quan trọng.</p>
        </div>
        <span className="badge">{unreadCount} chưa đọc</span>
      </div>

      <div className="card">
        <div className="table-wrap table-compact">
          <table>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Mức độ</th>
                <th>Module</th>
                <th>Loại</th>
                <th>Tiêu đề</th>
                <th>Người thao tác</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className={row.is_read ? undefined : "unread-row"}>
                  <td>{formatDate(row.created_at)}</td>
                  <td><span className={severityClass(row.severity)}>{row.severity}</span></td>
                  <td>{row.module ?? "-"}</td>
                  <td>{row.type}</td>
                  <td>
                    <strong>{row.title}</strong>
                    {row.message ? <div className="muted-text">{row.message}</div> : null}
                  </td>
                  <td>{row.actor_name ?? "-"}</td>
                  <td>{row.is_read ? "Đã đọc" : "Chưa đọc"}</td>
                  <td>
                    {!row.is_read ? (
                      <form action={markNotificationRead}>
                        <input type="hidden" name="id" value={row.id} />
                        <button className="btn" type="submit">Đánh dấu đã đọc</button>
                      </form>
                    ) : <span className="muted-text">-</span>}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={8} className="muted-text">Chưa có notification.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
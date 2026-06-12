import { bookings, STATUS_LABEL, formatVnd, formatMillions, type BookingStatus } from "../_data";

const tabs: { key: BookingStatus | "ALL"; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "WIN", label: "Win" },
  { key: "HIEU_QUA", label: "Hiệu quả" },
  { key: "NUOI", label: "Nuôi" },
  { key: "TEST", label: "Test" },
  { key: "DUNG", label: "Dừng" },
  { key: "SPAM", label: "Spam" },
];

const decisionForStatus = (s: BookingStatus) => {
  if (s === "HIEU_QUA") return "Push thêm video, tối ưu nội dung";
  if (s === "NUOI") return "Test thêm video, tối ưu nội dung";
  if (s === "DUNG") return "Ngừng hợp tác";
  if (s === "TEST") return "Quan sát thêm";
  if (s === "WIN") return "Mở rộng deal";
  return "–";
};

export default function BookingsPage() {
  const total = bookings.length;
  const totalGmv = bookings.reduce((s, b) => s + b.gmv, 0);
  const aired = bookings.filter((b) => b.aired).length;
  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Booking Log</h1>
          <p className="page-subtitle">Quyết định KOC tự tính theo đơn/tuần &amp; đơn/video (như công thức gốc)</p>
        </div>
        <div className="koc-filters">
          {tabs.map((t) => (
            <button key={t.key} className={`chip ${t.key === "ALL" ? "is-active" : ""}`}>{t.label}</button>
          ))}
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card"><div className="kpi-label">Tổng booking</div><div className="kpi-value">{total}</div></div>
        <div className="kpi-card"><div className="kpi-label">Tổng GMV</div><div className="kpi-value" style={{ color: "#ef4444" }}>{formatMillions(totalGmv)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Đã air</div><div className="kpi-value">{aired}</div></div>
        <div className="kpi-card"><div className="kpi-label">GMV trung bình / booking</div><div className="kpi-value">{formatMillions(totalGmv / total)}</div></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="booking-table">
            <thead>
              <tr>
                <th>KOC</th><th>Sản phẩm</th><th>Tier</th><th>Thời gian vào</th>
                <th>Duyệt</th><th>Book</th><th>Status</th>
                <th>Video</th><th>Tổng đơn</th><th>Đơn/tuần</th><th>Đơn/video</th>
                <th>GMV</th><th>Quyết định</th><th>Hành động</th><th>Member</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>
                    <div><strong>{b.koc}</strong></div>
                    {b.sub && <div className="muted-text">{b.sub}</div>}
                  </td>
                  <td><span className="badge muted">{b.product}</span></td>
                  <td><span className="tier-pill">{b.tier}</span></td>
                  <td className="mono">{b.enteredAt}</td>
                  <td className="mono">{b.approvedAt}</td>
                  <td className="mono">{b.bookedAt}</td>
                  <td>{b.aired ? <span className="status status-aired">Đã air</span> : <span className="status">Chờ</span>}</td>
                  <td>{b.videos}</td>
                  <td><strong>{b.orders.toLocaleString("vi-VN")}</strong></td>
                  <td>{b.ordersPerWeek}</td>
                  <td>{b.ordersPerVideo}</td>
                  <td><strong>{formatVnd(b.gmv)}</strong></td>
                  <td><span className={`status status-${b.status.toLowerCase()}`}>{STATUS_LABEL[b.status]}</span></td>
                  <td className="muted-text">{decisionForStatus(b.status)}</td>
                  <td><span className="member-chip">{b.member}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

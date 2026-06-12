import { leads, STAGE_LABEL, type LeadStage } from "../_data";

const tabs: { key: LeadStage | "all"; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "cho_duyet_lien_he", label: "Chờ duyệt liên hệ" },
  { key: "da_duyet_lien_he", label: "Đã duyệt — đang liên hệ" },
  { key: "cho_duyet_hop_tac", label: "Chờ duyệt hợp tác" },
  { key: "da_chot_booking", label: "Đã chốt → Booking" },
];

export default function LeadsPage() {
  const count = (k: LeadStage | "all") => k === "all" ? leads.length : leads.filter((l) => l.stage === k).length;
  return (
    <>
      <div className="koc-header">
        <div className="koc-header-icon">👥</div>
        <div>
          <h1 className="koc-h1">KOC Lead → Deal</h1>
          <div className="koc-sub">Member nhập → admin duyệt liên hệ → liên hệ → gửi duyệt hợp tác → admin duyệt → Booking</div>
        </div>
      </div>

      <div className="lead-toolbar">
        <div className="search-box">
          <span>🔎</span>
          <input placeholder="Tìm KOC..." />
        </div>
        <button className="btn-soft">⬆ Import Excel</button>
        <button className="btn-primary">+ Nhập KOC</button>
      </div>

      <div className="stage-tabs">
        {tabs.map((t) => (
          <button key={t.key} className={`stage-tab ${t.key === "all" ? "is-active" : ""}`}>
            {t.label} <span className="stage-count">({count(t.key)})</span>
          </button>
        ))}
      </div>

      <div className="panel no-pad">
        <div className="koc-table-wrap">
          <table className="koc-table lead-table">
            <thead>
              <tr>
                <th>KOC</th><th>SẢN PHẨM</th><th>TIER</th><th>FOLLOW</th>
                <th>MEMBER</th><th>GIAI ĐOẠN</th><th>CAST</th><th>VIDEO</th><th>HÀNG MẪU</th><th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div><strong>{l.koc}</strong></div>
                    <div className="muted-text">{l.sub}</div>
                  </td>
                  <td><span className="prod-pill">{l.product}</span></td>
                  <td><span className="tier-pill">{l.tier}</span></td>
                  <td>{l.follow ?? "—"}</td>
                  <td><span className="member-name">{l.member}</span></td>
                  <td><span className={`stage-pill stage-${l.stage}`}>{STAGE_LABEL[l.stage]}</span></td>
                  <td>{l.cast ? l.cast.toLocaleString("vi-VN") + "đ" : "—"}</td>
                  <td>{l.video ?? "—"}</td>
                  <td className="muted-text">{l.sample ?? "—"}</td>
                  <td>
                    {l.stage === "cho_duyet_hop_tac" ? (
                      <div className="row-actions">
                        <button className="btn-action">Duyệt → Booking</button>
                        <button className="btn-x">✕</button>
                      </div>
                    ) : l.stage === "da_chot_booking" ? (
                      <span className="status-ok">✓ Đã vào Booking</span>
                    ) : l.stage === "da_duyet_lien_he" ? (
                      <button className="btn-soft sm">↗ Gửi duyệt hợp tác</button>
                    ) : <span className="muted-text">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

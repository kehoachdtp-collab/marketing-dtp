import { overview, formatMillions, formatVnd, STATUS_LABEL } from "./_data";

function AreaChart({ data }: { data: { w: string; v: number }[] }) {
  const W = 640, H = 240, PAD_X = 36, PAD_T = 20, PAD_B = 36;
  const max = 60;
  const stepX = (W - PAD_X * 2) / (data.length - 1);
  const points = data.map((d, i) => {
    const x = PAD_X + i * stepX;
    const y = H - PAD_B - (d.v / max) * (H - PAD_T - PAD_B);
    return { x, y, ...d };
  });
  const path = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");
  const area = `${path} L${points[points.length - 1].x},${H - PAD_B} L${points[0].x},${H - PAD_B} Z`;
  const yTicks = [0, 15, 30, 45, 60];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg">
      <defs>
        <linearGradient id="gmvArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ff6b4a" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ff6b4a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t) => {
        const y = H - PAD_B - (t / max) * (H - PAD_T - PAD_B);
        return (
          <g key={t}>
            <line x1={PAD_X} x2={W - 8} y1={y} y2={y} stroke="#f0e6dc" strokeWidth="1" />
            <text x={PAD_X - 8} y={y + 4} textAnchor="end" className="chart-axis">{t}</text>
          </g>
        );
      })}
      <path d={area} fill="url(#gmvArea)" />
      <path d={path} fill="none" stroke="#ff5a36" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p) => (
        <g key={p.w}>
          <circle cx={p.x} cy={p.y} r={4.5} fill="#fff" stroke="#ff5a36" strokeWidth="2" />
          <text x={p.x} y={H - 12} textAnchor="middle" className="chart-axis">{p.w}</text>
        </g>
      ))}
    </svg>
  );
}

function Donut({ data }: { data: { name: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 85, r = 56, CX = 110, CY = 110;
  let acc = 0;
  const segs = data.map((d) => {
    const start = acc / total;
    acc += d.value;
    const end = acc / total;
    const a0 = start * Math.PI * 2 - Math.PI / 2;
    const a1 = end * Math.PI * 2 - Math.PI / 2;
    const large = end - start > 0.5 ? 1 : 0;
    const x0 = CX + R * Math.cos(a0), y0 = CY + R * Math.sin(a0);
    const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
    const x2 = CX + r * Math.cos(a1), y2 = CY + r * Math.sin(a1);
    const x3 = CX + r * Math.cos(a0), y3 = CY + r * Math.sin(a0);
    return { d, path: `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z` };
  });
  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 220 220" width="220" height="220">
        {segs.map((s) => <path key={s.d.name} d={s.path} fill={s.d.color} />)}
      </svg>
      <ul className="donut-legend">
        {data.map((d) => (
          <li key={d.name}>
            <span className="dot" style={{ background: d.color }} /> {d.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KocOverview() {
  return (
    <>
      <div className="koc-header">
        <div className="koc-header-icon">▦</div>
        <div>
          <h1 className="koc-h1">Tổng quan</h1>
          <div className="koc-sub">Toàn bộ hoạt động KOC</div>
        </div>
      </div>

      <div className="koc-filter-row">
        <button className="chip">Ngày</button>
        <button className="chip">Tuần</button>
        <button className="chip">Tháng</button>
        <button className="chip is-active">Tuỳ chỉnh</button>
        <input type="date" defaultValue="2025-01-01" className="date-input" />
        <span className="filter-arrow">→</span>
        <input type="date" defaultValue="2026-06-11" className="date-input" />
        <select className="select-input">
          <option>Tất cả sản phẩm</option>
        </select>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">GMV</div>
          <div className="kpi-value gmv">
            {(overview.gmv / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
            <span className="kpi-unit">triệu</span>
          </div>
          <div className="kpi-hint">Mục tiêu 4300tr/tháng</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Tổng đơn</div>
          <div className="kpi-value">{overview.totalOrders.toLocaleString("vi-VN")}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Lead cần xử lý</div>
          <div className="kpi-value">{overview.leadsToProcess} <span className="kpi-unit">KOC</span></div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Video Win 🔥</div>
          <div className="kpi-value">{overview.videoWin} <span className="kpi-unit">video</span></div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><h3 className="panel-title">GMV theo tuần (triệu)</h3></div>
          <AreaChart data={overview.gmvByWeek} />
        </div>
        <div className="panel">
          <div className="panel-head"><h3 className="panel-title">GMV theo nhân sự (triệu)</h3></div>
          <Donut data={overview.gmvByMember} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head"><h3 className="panel-title">🏆 Top KOC Win</h3></div>
        <div className="koc-table-wrap">
          <table className="koc-table">
            <thead>
              <tr><th>#</th><th>KOC</th><th>SẢN PHẨM</th><th>ĐƠN</th><th>GMV</th><th></th></tr>
            </thead>
            <tbody>
              {overview.topWin.map((r) => (
                <tr key={r.rank}>
                  <td><strong>{r.rank}</strong></td>
                  <td><strong>{r.koc}</strong></td>
                  <td><span className="prod-pill">{r.product}</span></td>
                  <td>{r.orders.toLocaleString("vi-VN")}</td>
                  <td><strong>{formatVnd(r.gmv)}</strong></td>
                  <td>{r.status === "WIN" && <span className="win-badge">WIN 🔥</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="koc-footnote">Tổng GMV trong kỳ: <strong>{formatMillions(overview.gmv)}</strong> · {STATUS_LABEL.WIN}</div>
    </>
  );
}

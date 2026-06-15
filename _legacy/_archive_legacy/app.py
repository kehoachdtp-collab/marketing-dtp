"""
MKT Dashboard - Theo dõi công việc Team Marketing
Chạy: streamlit run app.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import os
import glob
import io
import warnings
from datetime import datetime

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────
# PAGE CONFIG
# ─────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="MKT Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─────────────────────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────────────────────
DEFAULT_DIR = r"C:\Users\Admin\OneDrive\Documents\MKT DTP"

PRIORITY_COLUMNS = [
    "Hạng mục",
    "Mục tiêu",
    "STT",
    "Kênh đang quản lý",
    "Người chịu trách nhiệm chính",
    "Vai trò",
    "Công việc cần xử lý",
    "KPI",
    "Deadline",
    "Tiến độ",
    "Link on air",
    "Kết quả",
    "Mục tiêu cá nhân",
    "Tỷ lệ hoàn thành cá nhân",
    "Mục tiêu team",
    "Tỷ lệ hoàn thành team",
]

# Alias map: key = tên chuẩn, value = danh sách alias (lowercase)
COL_ALIASES: dict[str, list[str]] = {
    "Hạng mục": ["hạng mục", "hang muc", "danh mục", "đầu mục", "dau muc", "category"],
    "Mục tiêu": ["mục tiêu", "muc tieu", "target", "goal", "chỉ tiêu tổng"],
    "STT": ["stt", "số thứ tự", "so thu tu", "no", "số", "tt"],
    "Kênh đang quản lý": ["kênh đang quản lý", "kenh", "kênh", "channel", "kênh quản lý"],
    "Người chịu trách nhiệm chính": [
        "người chịu trách nhiệm chính",
        "nguoi chiu trach nhiem",
        "người phụ trách",
        "phụ trách",
        "responsible",
        "người thực hiện",
        "nhân sự",
    ],
    "Vai trò": ["vai trò", "vai tro", "role", "chức vụ", "chức danh"],
    "Công việc cần xử lý": [
        "công việc cần xử lý",
        "công việc",
        "cong viec",
        "task",
        "nhiệm vụ",
        "đầu việc",
    ],
    "KPI": ["kpi", "chỉ tiêu", "chi tieu", "target kpi", "kpi/mục tiêu"],
    "Deadline": ["deadline", "hạn chót", "hạn", "ngày hết hạn", "ngày deadline"],
    "Tiến độ": ["tiến độ", "tien do", "progress", "thực hiện", "kết quả thực hiện"],
    "Link on air": ["link on air", "link", "đường dẫn", "url"],
    "Kết quả": ["kết quả", "ket qua", "result", "outcome", "kq"],
    "Mục tiêu cá nhân": ["mục tiêu cá nhân", "muc tieu ca nhan", "personal target"],
    "Tỷ lệ hoàn thành cá nhân": [
        "tỷ lệ hoàn thành cá nhân",
        "ty le hoan thanh ca nhan",
        "% cá nhân",
        "hoàn thành cá nhân",
        "% ht cá nhân",
    ],
    "Mục tiêu team": ["mục tiêu team", "muc tieu team", "team target"],
    "Tỷ lệ hoàn thành team": [
        "tỷ lệ hoàn thành team",
        "ty le hoan thanh team",
        "% team",
        "hoàn thành team",
        "tỷ lệ hoàn thành",
        "% ht",
        "% hoàn thành",
        "tỷ lệ ht",
    ],
}


# ─────────────────────────────────────────────────────────────
# CSS
# ─────────────────────────────────────────────────────────────
def inject_css() -> None:
    st.markdown(
        """
<style>
/* ─── Global ─── */
html, body, [class*="css"] { font-family: 'Segoe UI', sans-serif; }

/* ─── Header ─── */
.mkt-header {
    background: linear-gradient(135deg, #0A2342 0%, #1565C0 100%);
    color: #fff;
    padding: 22px 32px;
    border-radius: 14px;
    text-align: center;
    margin-bottom: 22px;
    box-shadow: 0 4px 24px rgba(10,35,66,.22);
}
.mkt-header h1 { margin:0; font-size:21px; font-weight:700; letter-spacing:.8px; }
.mkt-header p  { margin:6px 0 0; font-size:12px; opacity:.82; }

/* ─── KPI Card ─── */
.kpi-card {
    background:#fff;
    border-radius:12px;
    padding:18px 12px;
    text-align:center;
    box-shadow:0 2px 14px rgba(0,0,0,.07);
    border-top:4px solid #1565C0;
    height:100%;
}
.kpi-icon  { font-size:26px; margin-bottom:6px; line-height:1; }
.kpi-value { font-size:30px; font-weight:700; color:#0A2342; line-height:1.1; }
.kpi-label { font-size:10px; color:#777; text-transform:uppercase; letter-spacing:.6px; margin-top:5px; }

.kpi-card.c-green  { border-top-color:#27AE60; } .kpi-card.c-green  .kpi-value { color:#27AE60; }
.kpi-card.c-orange { border-top-color:#E67E22; } .kpi-card.c-orange .kpi-value { color:#E67E22; }
.kpi-card.c-red    { border-top-color:#C0392B; } .kpi-card.c-red    .kpi-value { color:#C0392B; }
.kpi-card.c-blue   { border-top-color:#2980B9; } .kpi-card.c-blue   .kpi-value { color:#2980B9; }
.kpi-card.c-purple { border-top-color:#8E44AD; } .kpi-card.c-purple .kpi-value { color:#8E44AD; }

/* ─── Section title ─── */
.sec-title {
    background:#0A2342;
    color:#fff;
    padding:9px 18px;
    border-radius:8px;
    font-size:13px;
    font-weight:600;
    margin:22px 0 14px;
    letter-spacing:.4px;
}

/* ─── Category card ─── */
.cat-card {
    background:#fff;
    border-radius:10px;
    padding:14px 16px;
    margin-bottom:10px;
    box-shadow:0 2px 10px rgba(0,0,0,.06);
    border-left:5px solid #1565C0;
}
.cat-card.s-green  { border-left-color:#27AE60; }
.cat-card.s-blue   { border-left-color:#2980B9; }
.cat-card.s-orange { border-left-color:#E67E22; }
.cat-card.s-red    { border-left-color:#C0392B; }
.cat-card.s-gray   { border-left-color:#BDC3C7; }

.cat-title { font-size:14px; font-weight:700; color:#0A2342; margin-bottom:6px; }
.cat-meta  { font-size:12px; color:#666; margin:2px 0; }

/* ─── Progress bar ─── */
.prg-wrap { background:#ECEFF1; border-radius:6px; height:7px; margin:8px 0; overflow:hidden; }
.prg-fill  { height:100%; border-radius:6px; }

/* ─── Badge ─── */
.badge {
    display:inline-block; padding:2px 9px;
    border-radius:20px; font-size:10px; font-weight:700;
    color:#fff; margin-left:8px; vertical-align:middle;
}
.b-green  { background:#27AE60; }
.b-blue   { background:#2980B9; }
.b-orange { background:#E67E22; }
.b-red    { background:#C0392B; }
.b-gray   { background:#95A5A6; }

/* ─── Report block ─── */
.rpt-block  { background:#fff; border-radius:12px; padding:26px; box-shadow:0 2px 14px rgba(0,0,0,.07); margin-bottom:14px; }
.rpt-header { background:linear-gradient(135deg,#0A2342,#1565C0); color:#fff; padding:22px; border-radius:10px; text-align:center; margin-bottom:18px; }

/* ─── Bullet item ─── */
.bullet { background:#F8F9FA; border-radius:8px; padding:10px 14px; margin:5px 0; border-left:3px solid #1565C0; font-size:13px; }

/* ─── Misc ─── */
.stTabs [data-baseweb="tab"] { border-radius:8px 8px 0 0; font-size:13px; font-weight:500; }
div[data-testid="stMetric"] { background:#fff; border-radius:10px; padding:14px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
</style>
""",
        unsafe_allow_html=True,
    )


# ─────────────────────────────────────────────────────────────
# STATUS HELPERS
# ─────────────────────────────────────────────────────────────
StatusInfo = tuple[str, str, str, str]  # label, card-class, badge-class, emoji


def parse_rate(val) -> float | None:
    """Chuyển ô % về float. Trả None nếu không đọc được."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        if np.isnan(val):
            return None
        return float(val) * 100 if val < 2 else float(val)   # 0.9 → 90, 90 → 90
    s = str(val).strip().replace("%", "").replace(",", ".").replace(" ", "")
    try:
        v = float(s)
        return v * 100 if v < 2 else v
    except ValueError:
        return None


def status_info(rate: float | None) -> StatusInfo:
    if rate is None:
        return "Chưa cập nhật", "s-gray", "b-gray", "⬜"
    if rate >= 100:
        return "Vượt/Hoàn thành", "s-green", "b-green", "✅"
    if rate >= 80:
        return "Gần đạt", "s-blue", "b-blue", "🔵"
    if rate >= 50:
        return "Cần thúc đẩy", "s-orange", "b-orange", "🟠"
    return "Rủi ro", "s-red", "b-red", "🔴"


def progress_color(rate: float | None) -> str:
    if rate is None:
        return "#BDC3C7"
    if rate >= 100:
        return "#27AE60"
    if rate >= 80:
        return "#2980B9"
    if rate >= 50:
        return "#E67E22"
    return "#C0392B"


# ─────────────────────────────────────────────────────────────
# HTML COMPONENTS
# ─────────────────────────────────────────────────────────────
def kpi_card(icon: str, value, label: str, cls: str = "") -> str:
    return (
        f'<div class="kpi-card {cls}">'
        f'<div class="kpi-icon">{icon}</div>'
        f'<div class="kpi-value">{value}</div>'
        f'<div class="kpi-label">{label}</div>'
        f"</div>"
    )


def sec_title(icon: str, text: str) -> str:
    return f'<div class="sec-title">{icon}&nbsp; {text}</div>'


def prg_bar(rate: float | None) -> str:
    pct = min(max(rate or 0, 0), 100)
    color = progress_color(rate)
    return (
        f'<div class="prg-wrap">'
        f'<div class="prg-fill" style="width:{pct:.0f}%;background:{color};"></div>'
        f"</div>"
    )


def badge(text: str, cls: str) -> str:
    return f'<span class="badge {cls}">{text}</span>'


# ─────────────────────────────────────────────────────────────
# FILE / EXCEL HELPERS
# ─────────────────────────────────────────────────────────────
def find_excel_files(directory: str) -> list[str]:
    files: list[str] = []
    for ext in ("*.xlsx", "*.xls", "*.xlsm"):
        files.extend(glob.glob(os.path.join(directory, ext)))
    return sorted(files)


def load_excel(filepath: str, sheet_name: str) -> tuple[pd.DataFrame | None, str | None]:
    """Đọc sheet, tự tìm header row."""
    try:
        # Đọc không header để tìm hàng tiêu đề
        raw = pd.read_excel(filepath, sheet_name=sheet_name, header=None, nrows=20)
        header_row = 0
        for i, row in raw.iterrows():
            if row.count() >= 3:
                header_row = int(i)
                break

        df = pd.read_excel(filepath, sheet_name=sheet_name, header=header_row)
        # Làm sạch tên cột
        clean_cols: list[str] = []
        for i, c in enumerate(df.columns):
            s = str(c).strip()
            clean_cols.append(s if not s.startswith("Unnamed") else f"_col{i}")
        df.columns = clean_cols
        df = df.dropna(how="all").reset_index(drop=True)
        return df, None
    except Exception as exc:
        return None, str(exc)


def smart_detect(columns: list[str]) -> dict[str, str]:
    """Trả mapping: tên_chuẩn → tên_thực_trong_df."""
    mapping: dict[str, str] = {}
    lower_map = {c: c.lower().strip() for c in columns}
    for std, aliases in COL_ALIASES.items():
        for col, col_lower in lower_map.items():
            if col_lower in aliases or col == std:
                mapping[std] = col
                break
        if std not in mapping and std in columns:
            mapping[std] = std
    return mapping


def ffill_col(df: pd.DataFrame, col: str) -> pd.DataFrame:
    """Forward-fill cột (xử lý ô gộp)."""
    if col not in df.columns:
        return df
    df = df.copy()
    df[col] = df[col].replace({"": np.nan, "nan": np.nan})
    df[col] = df[col].ffill()
    return df


# ─────────────────────────────────────────────────────────────
# INSIGHT BULLETS
# ─────────────────────────────────────────────────────────────
def generate_bullets(
    df: pd.DataFrame,
    cat_col: str | None,
    person_col: str | None,
) -> list[str]:
    bullets: list[str] = []
    if "_rate" not in df.columns:
        return ["📊 Chưa có dữ liệu tỷ lệ hoàn thành để phân tích."]

    if cat_col and cat_col in df.columns:
        cat_rates = df.groupby(cat_col)["_rate"].mean().dropna()
        best = cat_rates[cat_rates >= 100].index.tolist()
        near = cat_rates[(cat_rates >= 80) & (cat_rates < 100)].index.tolist()
        risk = cat_rates[cat_rates < 50].index.tolist()
        mid  = cat_rates[(cat_rates >= 50) & (cat_rates < 80)].index.tolist()

        if best:
            bullets.append(f"✅ **Hoàn thành / vượt mục tiêu:** {', '.join(best)}")
        if near:
            bullets.append(f"🔵 **Gần đạt — cần duy trì đà:** {', '.join(near)}")
        if mid:
            bullets.append(f"🟠 **Cần thúc đẩy thêm:** {', '.join(mid)}")
        if risk:
            bullets.append(f"🔴 **Rủi ro / chậm tiến độ — ưu tiên xử lý:** {', '.join(risk)}")

    if person_col and person_col in df.columns:
        p_rates = df.groupby(person_col)["_rate"].mean().dropna()
        top   = [str(p) for p in p_rates[p_rates >= 100].index.tolist()[:3]]
        slow  = [str(p) for p in p_rates[p_rates < 50].index.tolist()[:3]]
        if top:
            bullets.append(f"🌟 **Nhân sự vượt KPI:** {', '.join(top)}")
        if slow:
            bullets.append(f"⚠️ **Nhân sự cần hỗ trợ:** {', '.join(slow)}")

    no_data = int(df["_rate"].isna().sum())
    if no_data:
        bullets.append(f"⬜ **Thiếu dữ liệu:** {no_data} công việc chưa cập nhật tỷ lệ hoàn thành")

    return bullets or ["📊 Dữ liệu tốt — không có cảnh báo đặc biệt."]


# ─────────────────────────────────────────────────────────────
# EXPORT HELPERS
# ─────────────────────────────────────────────────────────────
def export_excel_bytes(df: pd.DataFrame, col_map: dict, ss) -> bytes:
    out = io.BytesIO()
    drop_internal = [c for c in df.columns if c.startswith("_")]
    clean_df = df.drop(columns=drop_internal, errors="ignore")

    with pd.ExcelWriter(out, engine="openpyxl") as writer:
        clean_df.to_excel(writer, sheet_name="Dữ liệu gốc", index=False)

        cat_col = col_map.get("Hạng mục")
        if cat_col and "_rate" in df.columns:
            cat_sum = (
                df.groupby(cat_col)
                .agg(
                    Số_công_việc=(cat_col, "count"),
                    Tỷ_lệ_TB=("_rate", "mean"),
                    Đã_hoàn_thành=("_rate", lambda x: (x >= 100).sum()),
                )
                .reset_index()
            )
            cat_sum["Tỷ_lệ_TB"] = cat_sum["Tỷ_lệ_TB"].apply(
                lambda x: f"{x:.0f}%" if pd.notna(x) else "—"
            )
            cat_sum.to_excel(writer, sheet_name="Theo hạng mục", index=False)

        notes = pd.DataFrame(
            {
                "Mục": ["Tháng báo cáo", "Ngày cập nhật", "Ghi chú quản lý", "Đánh giá tổng quan"],
                "Nội dung": [
                    ss.get("report_month", ""),
                    ss.get("report_date", ""),
                    ss.get("manager_note", ""),
                    ss.get("overall_eval", ""),
                ],
            }
        )
        notes.to_excel(writer, sheet_name="Ghi chú", index=False)

    return out.getvalue()


def export_html_str(df: pd.DataFrame, col_map: dict, ss) -> str:
    month = ss.get("report_month", "")
    rdate = ss.get("report_date", "")
    cat_col = col_map.get("Hạng mục")
    person_col = col_map.get("Người chịu trách nhiệm chính")

    rows = ""
    if cat_col and "_rate" in df.columns and cat_col in df.columns:
        for cat in df[cat_col].dropna().unique():
            cdf = df[df[cat_col] == cat]
            rate = cdf["_rate"].mean() if len(cdf) > 0 else None
            lbl, _, _, emo = status_info(rate)
            rate_str = f"{rate:.0f}%" if rate is not None else "—"
            persons: list[str] = []
            if person_col and person_col in cdf.columns:
                persons = [str(p) for p in cdf[person_col].dropna().unique() if str(p).strip() not in ("", "nan")]
            rows += (
                f"<tr><td><b>{cat}</b></td>"
                f"<td>{', '.join(persons[:2]) or '—'}</td>"
                f"<td>{len(cdf)}</td>"
                f"<td>{rate_str}</td>"
                f"<td>{emo} {lbl}</td></tr>"
            )

    bullets_html = "".join(
        f"<li>{b.replace('**','')}</li>"
        for b in generate_bullets(df, cat_col, person_col)
    )

    return f"""<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8">
<title>MKT Dashboard — Tháng {month}</title>
<style>
body{{font-family:'Segoe UI',sans-serif;background:#f5f7fa;margin:0;padding:24px;color:#222}}
.hdr{{background:linear-gradient(135deg,#0A2342,#1565C0);color:#fff;padding:22px;border-radius:12px;text-align:center;margin-bottom:20px}}
.hdr h1{{margin:0;font-size:20px;font-weight:700}}
.hdr p{{margin:6px 0 0;font-size:12px;opacity:.82}}
table{{width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.08);margin-bottom:20px}}
th{{background:#0A2342;color:#fff;padding:11px 14px;text-align:left;font-size:13px}}
td{{padding:9px 14px;border-bottom:1px solid #f0f0f0;font-size:13px}}
tr:hover{{background:#f8f9fa}}
ul{{background:#fff;border-radius:10px;padding:18px 18px 18px 36px;box-shadow:0 2px 10px rgba(0,0,0,.08)}}
li{{margin:6px 0;font-size:13px}}
.footer{{text-align:center;font-size:11px;color:#aaa;margin-top:24px}}
</style></head><body>
<div class="hdr">
  <h1>📊 BÁO CÁO THEO DÕI CÔNG VIỆC TEAM MARKETING — THÁNG {month}</h1>
  <p>📅 Cập nhật đến ngày {rdate}</p>
</div>
<h3 style="color:#0A2342">📋 Tiến độ theo hạng mục</h3>
<table>
<thead><tr><th>Hạng mục</th><th>Người phụ trách</th><th>Số CV</th><th>Tỷ lệ HT</th><th>Trạng thái</th></tr></thead>
<tbody>{rows}</tbody>
</table>
<h3 style="color:#0A2342">💡 Điểm nhấn</h3>
<ul>{bullets_html}</ul>
<div class="footer">Xuất từ MKT Dashboard &nbsp;|&nbsp; {rdate}</div>
</body></html>"""


def generate_copy_text(df: pd.DataFrame, col_map: dict, ss) -> str:
    month = ss.get("report_month", "")
    rdate = ss.get("report_date", "")
    cat_col = col_map.get("Hạng mục")
    person_col = col_map.get("Người chịu trách nhiệm chính")

    total = len(df)
    done = int((df["_rate"] >= 100).sum()) if "_rate" in df.columns else 0
    avg  = df["_rate"].mean() if "_rate" in df.columns else None

    lines = [
        f"BÁO CÁO THEO DÕI CÔNG VIỆC TEAM MARKETING — THÁNG {month}",
        f"Cập nhật: {rdate}",
        "=" * 50,
        "",
        "TỔNG QUAN:",
        f"  - Tổng công việc/KPI : {total}",
        f"  - Hoàn thành          : {done}",
        f"  - Tỷ lệ TB toàn team : {avg:.0f}%" if avg else "  - Tỷ lệ TB           : Chưa cập nhật",
        "",
    ]

    if cat_col and "_rate" in df.columns and cat_col in df.columns:
        lines.append("TIẾN ĐỘ THEO HẠNG MỤC:")
        for cat in df[cat_col].dropna().unique():
            cdf = df[df[cat_col] == cat]
            rate = cdf["_rate"].mean()
            lbl, _, _, emo = status_info(rate)
            rate_str = f"{rate:.0f}%" if rate is not None else "—"
            lines.append(f"  {emo} {cat}: {rate_str}  ({lbl})")
        lines.append("")

    lines.append("ĐIỂM NHẤN:")
    for b in generate_bullets(df, cat_col, person_col):
        lines.append("  • " + b.replace("**", ""))

    note = ss.get("manager_note", "")
    if note:
        lines += ["", f"GHI CHÚ QUẢN LÝ: {note}"]

    return "\n".join(lines)


# ─────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────
def main() -> None:
    inject_css()

    # ── Session state defaults ──
    defaults = {
        "df": None,
        "raw_cols": [],
        "col_map": {},
        "report_month": datetime.now().strftime("%-m/%Y") if os.name != "nt" else f"{datetime.now().month}/{datetime.now().year}",
        "report_date": datetime.now().strftime("%d/%m/%Y"),
        "manager_note": "",
        "overall_eval": "",
        "extra_tasks": [],
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

    # ══════════════════════════════════════════════════════════
    # SIDEBAR
    # ══════════════════════════════════════════════════════════
    with st.sidebar:
        st.markdown("### 📂 Chọn dữ liệu")

        data_dir = st.text_input("Thư mục dữ liệu", value=DEFAULT_DIR)

        excel_files: list[str] = []
        if os.path.isdir(data_dir):
            excel_files = find_excel_files(data_dir)

        if not excel_files:
            st.warning("⚠️ Không tìm thấy file Excel.")
            st.markdown("---")
            st.markdown("**📤 Hoặc upload file:**")
            uploaded = st.file_uploader("Tải file Excel lên", type=["xlsx", "xls", "xlsm"])
            if uploaded:
                import tempfile
                suffix = os.path.splitext(uploaded.name)[1]
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(uploaded.read())
                    excel_files = [tmp.name]

        selected_file: str | None = None
        sel_sheet: str | None = None

        if excel_files:
            names = [os.path.basename(f) for f in excel_files]
            idx = st.selectbox("File Excel", range(len(names)), format_func=lambda i: names[i])
            selected_file = excel_files[idx]

            try:
                xl = pd.ExcelFile(selected_file)
                sheets = xl.sheet_names
                sel_sheet = st.selectbox("Sheet", sheets)
            except Exception as e:
                st.error(f"Không mở được file: {e}")

            if st.button("🔄 Tải dữ liệu", type="primary", use_container_width=True):
                if sel_sheet:
                    df_loaded, err = load_excel(selected_file, sel_sheet)
                    if err:
                        st.error(f"Lỗi đọc file: {err}")
                    else:
                        st.session_state.df = df_loaded
                        st.session_state.raw_cols = list(df_loaded.columns)
                        st.session_state.col_map = smart_detect(list(df_loaded.columns))
                        st.success(f"✅ Đã tải {len(df_loaded)} dòng, {len(df_loaded.columns)} cột")
                        st.rerun()

        st.markdown("---")
        st.markdown("### ⚙️ Báo cáo")
        st.session_state["report_month"] = st.text_input(
            "Tháng báo cáo", value=st.session_state["report_month"]
        )
        st.session_state["report_date"] = st.text_input(
            "Ngày cập nhật", value=st.session_state["report_date"]
        )
        st.markdown("---")
        st.caption("📊 MKT Dashboard v1.0")

    # ══════════════════════════════════════════════════════════
    # HEADER
    # ══════════════════════════════════════════════════════════
    month_str = st.session_state["report_month"]
    date_str  = st.session_state["report_date"]
    st.markdown(
        f"""<div class="mkt-header">
        <h1>📊 THEO DÕI CÔNG VIỆC TEAM MARKETING — THÁNG {month_str}</h1>
        <p>📅 Cập nhật đến ngày {date_str}</p>
        </div>""",
        unsafe_allow_html=True,
    )

    # ── No data yet ──
    if st.session_state["df"] is None:
        st.info("👈 Chọn thư mục, file Excel, sheet rồi nhấn **Tải dữ liệu** ở thanh bên trái.")
        st.markdown(
            """
### Hướng dẫn sử dụng
1. Thư mục mặc định: `C:\\Users\\Admin\\OneDrive\\Documents\\MKT DTP`
2. Chọn file `.xlsx` và sheet chứa dữ liệu công việc
3. Nhấn **Tải dữ liệu**
4. Nếu cột không tự nhận diện → dùng tab **⚙️ Cài đặt cột** để map thủ công

### Cấu trúc Excel cần có
| Hạng mục | Công việc cần xử lý | Người phụ trách | KPI | Tiến độ | Tỷ lệ hoàn thành |
|----------|---------------------|-----------------|-----|---------|------------------|
| Booking | Chốt hợp đồng | Nguyễn A | 50 đơn | 45 đơn | 90% |
"""
        )
        return

    # ══════════════════════════════════════════════════════════
    # BUILD WORKING DATAFRAME
    # ══════════════════════════════════════════════════════════
    df_raw: pd.DataFrame = st.session_state["df"]
    col_map: dict[str, str] = st.session_state["col_map"]

    def gc(name: str) -> str | None:
        """Get actual column name from standard name."""
        return col_map.get(name)

    def safe_val(row: pd.Series, name: str) -> str:
        col = gc(name)
        if not col or col not in row.index:
            return "Chưa cập nhật"
        v = row[col]
        if pd.isna(v) or str(v).strip() in ("", "nan", "None"):
            return "Chưa cập nhật"
        return str(v).strip()

    df = df_raw.copy()
    cat_col    = gc("Hạng mục")
    person_col = gc("Người chịu trách nhiệm chính")
    task_col   = gc("Công việc cần xử lý")
    kpi_col    = gc("KPI")
    rate_col   = gc("Tỷ lệ hoàn thành team") or gc("Tỷ lệ hoàn thành cá nhân")
    role_col   = gc("Vai trò")
    deadline_col = gc("Deadline")
    progress_col = gc("Tiến độ")
    result_col   = gc("Kết quả")
    goal_col     = gc("Mục tiêu")

    # Forward-fill category (merged cells)
    if cat_col:
        df = ffill_col(df, cat_col)

    # Compute rate
    if rate_col and rate_col in df.columns:
        df["_rate"] = df[rate_col].apply(parse_rate)
    else:
        df["_rate"] = None

    df["_status_lbl"]   = df["_rate"].apply(lambda r: status_info(r)[0])
    df["_status_cls"]   = df["_rate"].apply(lambda r: status_info(r)[1])
    df["_status_bdg"]   = df["_rate"].apply(lambda r: status_info(r)[2])
    df["_status_emo"]   = df["_rate"].apply(lambda r: status_info(r)[3])

    # ══════════════════════════════════════════════════════════
    # TABS
    # ══════════════════════════════════════════════════════════
    t1, t2, t3, t4, t5, t6 = st.tabs(
        [
            "📊 Tổng quan",
            "📋 Theo Hạng mục",
            "🔍 Bảng Chi tiết",
            "📄 Báo cáo 1 trang",
            "✏️ Nhập tay & Export",
            "⚙️ Cài đặt cột",
        ]
    )

    # ──────────────────────────────────────────────────────────
    # TAB 1 — TỔNG QUAN
    # ──────────────────────────────────────────────────────────
    with t1:
        n_cats   = df[cat_col].nunique() if cat_col and cat_col in df.columns else 0
        n_tasks  = int(df[task_col].notna().sum()) if task_col and task_col in df.columns else len(df)
        n_done   = int((df["_rate"] >= 100).sum()) if "_rate" in df.columns else 0
        n_inprog = int(((df["_rate"] >= 50) & (df["_rate"] < 100)).sum()) if "_rate" in df.columns else 0
        n_risk   = int((df["_rate"] < 50).sum()) if "_rate" in df.columns else 0
        avg_rate = df["_rate"].mean() if "_rate" in df.columns else None
        avg_str  = f"{avg_rate:.0f}%" if avg_rate is not None else "—"

        c1, c2, c3, c4, c5, c6 = st.columns(6)
        with c1: st.markdown(kpi_card("📁", n_cats or "—", "Đầu mục chính"), unsafe_allow_html=True)
        with c2: st.markdown(kpi_card("📝", n_tasks, "Tổng công việc", "c-blue"), unsafe_allow_html=True)
        with c3: st.markdown(kpi_card("✅", n_done, "Hoàn thành/Vượt", "c-green"), unsafe_allow_html=True)
        with c4: st.markdown(kpi_card("🟠", n_inprog, "Đang thực hiện", "c-orange"), unsafe_allow_html=True)
        with c5: st.markdown(kpi_card("🔴", n_risk, "Rủi ro / Chậm", "c-red"), unsafe_allow_html=True)
        with c6: st.markdown(kpi_card("📈", avg_str, "Tỷ lệ TB toàn team", "c-purple"), unsafe_allow_html=True)

        if rate_col:
            st.markdown(sec_title("📊", "PHÂN BỐ TRẠNG THÁI"), unsafe_allow_html=True)
            ca, cb = st.columns([3, 2])
            with ca:
                status_vc = df["_status_lbl"].value_counts().rename("Số công việc")
                st.bar_chart(status_vc)
            with cb:
                icons = {"Vượt/Hoàn thành":"✅","Gần đạt":"🔵","Cần thúc đẩy":"🟠","Rủi ro":"🔴","Chưa cập nhật":"⬜"}
                for lbl, cnt in status_vc.items():
                    pct = cnt / len(df) * 100
                    st.markdown(f"{icons.get(lbl,'⬜')} **{lbl}**: {cnt} ({pct:.0f}%)")

        if cat_col and rate_col:
            st.markdown(sec_title("🔍", "HẠNG MỤC CẦN CHÚ Ý"), unsafe_allow_html=True)
            cat_avg = df.groupby(cat_col)["_rate"].mean().dropna()
            ra, rb = st.columns(2)
            with ra:
                st.markdown("**🔴 Rủi ro (< 50%):**")
                rk = cat_avg[cat_avg < 50]
                if len(rk):
                    for cat, r in rk.items():
                        st.markdown(f"🔴 **{cat}** — {r:.0f}%")
                else:
                    st.success("Không có hạng mục rủi ro")
            with rb:
                st.markdown("**✅ Đang tốt (≥ 80%):**")
                gd = cat_avg[cat_avg >= 80].sort_values(ascending=False)
                if len(gd):
                    for cat, r in gd.items():
                        st.markdown(f"✅ **{cat}** — {r:.0f}%")
                else:
                    st.warning("Chưa có hạng mục đạt ≥ 80%")

    # ──────────────────────────────────────────────────────────
    # TAB 2 — THEO HẠNG MỤC
    # ──────────────────────────────────────────────────────────
    with t2:
        if not cat_col:
            st.warning("⚠️ Chưa nhận diện cột **Hạng mục**. Vui lòng map ở tab **⚙️ Cài đặt cột**.")
        else:
            categories = [
                c for c in df[cat_col].dropna().unique()
                if str(c).strip() not in ("", "nan")
            ]
            st.markdown(
                sec_title("📋", f"TIẾN ĐỘ {len(categories)} HẠNG MỤC"),
                unsafe_allow_html=True,
            )
            sel_cats = st.multiselect("Lọc hạng mục:", categories, default=categories)

            for i in range(0, len(sel_cats), 2):
                row_cats = sel_cats[i : i + 2]
                cols = st.columns(2)
                for j, cat in enumerate(row_cats):
                    with cols[j]:
                        cdf = df[df[cat_col] == cat]
                        rate = cdf["_rate"].mean() if "_rate" in cdf.columns and len(cdf) > 0 else None
                        lbl, cls, bdg_cls, emo = status_info(rate)
                        rate_str = f"{rate:.0f}%" if rate is not None else "Chưa cập nhật"
                        color = progress_color(rate)
                        n_done_cat = int((cdf["_rate"] >= 100).sum()) if "_rate" in cdf.columns else 0

                        persons: list[str] = []
                        if person_col and person_col in cdf.columns:
                            persons = [
                                str(p) for p in cdf[person_col].dropna().unique()
                                if str(p).strip() not in ("", "nan")
                            ]

                        goal_text = "—"
                        if goal_col and goal_col in cdf.columns:
                            goals = cdf[goal_col].dropna().unique().tolist()
                            if goals:
                                goal_text = str(goals[0])[:80]

                        pct = min(rate or 0, 100)
                        st.markdown(
                            f"""<div class="cat-card {cls}">
                            <div class="cat-title">{emo} {cat}
                                <span class="badge {bdg_cls}">{lbl}</span>
                            </div>
                            <div class="cat-meta">👤 {', '.join(persons[:3]) if persons else 'Chưa phân công'}</div>
                            <div class="cat-meta">🎯 {goal_text}</div>
                            <div class="cat-meta">📝 {len(cdf)} công việc &nbsp;|&nbsp; ✅ Xong: {n_done_cat}</div>
                            <div class="prg-wrap"><div class="prg-fill" style="width:{pct:.0f}%;background:{color};"></div></div>
                            <div class="cat-meta" style="font-weight:700;color:#111;">📊 Tỷ lệ: {rate_str}</div>
                            </div>""",
                            unsafe_allow_html=True,
                        )

                        display_cols = [
                            c for c in [task_col, person_col, kpi_col, deadline_col, progress_col, rate_col, result_col]
                            if c and c in cdf.columns
                        ]
                        with st.expander(f"Chi tiết {len(cdf)} công việc — {cat}"):
                            if display_cols:
                                show = cdf[display_cols].copy()
                                # Rename to standard names
                                inv = {v: k for k, v in col_map.items()}
                                show.columns = [inv.get(c, c) for c in display_cols]
                                st.dataframe(show.fillna("Chưa cập nhật"), use_container_width=True, hide_index=True)
                            else:
                                st.dataframe(cdf.fillna("Chưa cập nhật"), use_container_width=True, hide_index=True)

    # ──────────────────────────────────────────────────────────
    # TAB 3 — BẢNG CHI TIẾT
    # ──────────────────────────────────────────────────────────
    with t3:
        st.markdown(sec_title("🔍", "BẢNG CHI TIẾT CÔNG VIỆC"), unsafe_allow_html=True)

        fa, fb, fc, fd = st.columns(4)
        filtered = df.copy()

        with fa:
            if cat_col and cat_col in df.columns:
                opts = ["Tất cả"] + sorted([str(c) for c in df[cat_col].dropna().unique()])
                sel = st.selectbox("Hạng mục", opts, key="f_cat")
                if sel != "Tất cả":
                    filtered = filtered[filtered[cat_col] == sel]

        with fb:
            if person_col and person_col in df.columns:
                opts = ["Tất cả"] + sorted([str(p) for p in df[person_col].dropna().unique()])
                sel = st.selectbox("Người phụ trách", opts, key="f_person")
                if sel != "Tất cả":
                    filtered = filtered[filtered[person_col] == sel]

        with fc:
            if role_col and role_col in df.columns:
                opts = ["Tất cả"] + sorted([str(r) for r in df[role_col].dropna().unique()])
                sel = st.selectbox("Vai trò", opts, key="f_role")
                if sel != "Tất cả":
                    filtered = filtered[filtered[role_col] == sel]

        with fd:
            status_opts = ["Tất cả", "Vượt/Hoàn thành", "Gần đạt", "Cần thúc đẩy", "Rủi ro", "Chưa cập nhật"]
            sel_st = st.selectbox("Trạng thái", status_opts, key="f_status")
            if sel_st != "Tất cả":
                filtered = filtered[filtered["_status_lbl"] == sel_st]

        st.caption(f"Hiển thị {len(filtered)} / {len(df)} dòng")

        std_order = [
            "Hạng mục", "Công việc cần xử lý", "Người chịu trách nhiệm chính",
            "Vai trò", "Kênh đang quản lý", "KPI", "Deadline", "Tiến độ",
            "Kết quả", "Tỷ lệ hoàn thành team",
        ]
        actual_cols: list[str] = []
        renamed_cols: list[str] = []
        for sn in std_order:
            ac = gc(sn)
            if ac and ac in filtered.columns:
                actual_cols.append(ac)
                renamed_cols.append(sn)

        if "_status_emo" in filtered.columns:
            actual_cols.append("_status_emo")
            renamed_cols.append("Trạng thái")

        if actual_cols:
            show = filtered[actual_cols].copy()
            show.columns = renamed_cols
            st.dataframe(show.fillna("Chưa cập nhật"), use_container_width=True, hide_index=True, height=520)
        else:
            st.dataframe(
                filtered.drop(columns=[c for c in filtered.columns if c.startswith("_")], errors="ignore").fillna("Chưa cập nhật"),
                use_container_width=True, hide_index=True, height=520,
            )

    # ──────────────────────────────────────────────────────────
    # TAB 4 — BÁO CÁO 1 TRANG
    # ──────────────────────────────────────────────────────────
    with t4:
        st.markdown(
            f"""<div class="rpt-block"><div class="rpt-header">
            <h2 style="margin:0;font-size:19px;font-weight:700;letter-spacing:.8px;">
              📊 BÁO CÁO THEO DÕI CÔNG VIỆC TEAM MARKETING — THÁNG {month_str}
            </h2>
            <p style="margin:6px 0 0;font-size:12px;opacity:.85;">📅 Cập nhật đến ngày {date_str}</p>
            </div>""",
            unsafe_allow_html=True,
        )

        # Block 1
        st.markdown("### 📌 KHỐI 1 — TỔNG QUAN TEAM")
        m1, m2, m3, m4, m5 = st.columns(5)
        cats_n  = df[cat_col].nunique() if cat_col and cat_col in df.columns else "—"
        avg_r   = df["_rate"].mean() if "_rate" in df.columns else None
        done_n  = int((df["_rate"] >= 100).sum()) if "_rate" in df.columns else 0
        undone  = len(df) - done_n
        m1.metric("Tổng đầu mục", str(cats_n))
        m2.metric("Tổng KPI/CV",  str(len(df)))
        m3.metric("Hoàn thành",   str(done_n))
        m4.metric("Chưa xong",    str(undone))
        m5.metric("Tỷ lệ TB",     f"{avg_r:.0f}%" if avg_r else "—")

        # Block 2
        st.markdown("### 📋 KHỐI 2 — TIẾN ĐỘ THEO HẠNG MỤC")
        if cat_col and cat_col in df.columns:
            rpt2 = []
            for cat in df[cat_col].dropna().unique():
                cdf2 = df[df[cat_col] == cat]
                r = cdf2["_rate"].mean() if "_rate" in cdf2.columns else None
                lbl2, _, _, emo2 = status_info(r)
                persons2: list[str] = []
                if person_col and person_col in cdf2.columns:
                    persons2 = [str(p) for p in cdf2[person_col].dropna().unique() if str(p).strip() not in ("", "nan")]
                rpt2.append({
                    "Hạng mục":        cat,
                    "Người phụ trách": ", ".join(persons2[:2]) or "—",
                    "Số CV/KPI":       len(cdf2),
                    "Tỷ lệ HT":        f"{r:.0f}%" if r else "—",
                    "Trạng thái":      f"{emo2} {lbl2}",
                })
            st.dataframe(pd.DataFrame(rpt2), use_container_width=True, hide_index=True)

        # Block 3
        st.markdown("### 👥 KHỐI 3 — HIỆU SUẤT THEO NHÂN SỰ")
        if person_col and person_col in df.columns:
            rpt3 = []
            for person in df[person_col].dropna().unique():
                if str(person).strip() in ("", "nan"):
                    continue
                pdf3 = df[df[person_col] == person]
                r3  = pdf3["_rate"].mean() if "_rate" in pdf3.columns else None
                dn3 = int((pdf3["_rate"] >= 100).sum()) if "_rate" in pdf3.columns else 0
                role_val = "—"
                if role_col and role_col in pdf3.columns:
                    rl = [str(x) for x in pdf3[role_col].dropna().unique() if str(x).strip() not in ("", "nan")]
                    if rl: role_val = rl[0]
                _, _, _, emo3 = status_info(r3)
                rpt3.append({
                    "Nhân sự":         person,
                    "Vai trò":         role_val,
                    "Số KPI":          len(pdf3),
                    "Hoàn thành":      dn3,
                    "Tỷ lệ HT":        f"{r3:.0f}%" if r3 else "—",
                    "TT":              emo3,
                })
            if rpt3:
                st.dataframe(pd.DataFrame(rpt3), use_container_width=True, hide_index=True)

        # Block 4
        st.markdown("### 💡 KHỐI 4 — ĐIỂM NHẤN")
        for b in generate_bullets(df, cat_col, person_col):
            st.markdown(f'<div class="bullet">{b}</div>', unsafe_allow_html=True)

        if st.session_state["manager_note"]:
            st.markdown(
                f"""<div style="background:#E8F0FE;border-radius:8px;padding:14px 16px;margin-top:12px;border-left:4px solid #1565C0;">
                <strong>📝 Ghi chú quản lý:</strong><br>{st.session_state["manager_note"]}</div>""",
                unsafe_allow_html=True,
            )

        st.markdown("</div>", unsafe_allow_html=True)

    # ──────────────────────────────────────────────────────────
    # TAB 5 — NHẬP TAY & EXPORT
    # ──────────────────────────────────────────────────────────
    with t5:
        st.markdown(sec_title("✏️", "NHẬP TAY / GHI CHÚ"), unsafe_allow_html=True)

        ia, ib = st.columns(2)
        with ia:
            st.session_state["manager_note"] = st.text_area(
                "📝 Ghi chú quản lý",
                value=st.session_state["manager_note"],
                height=100,
                placeholder="Nhập ghi chú cho báo cáo...",
            )
            st.session_state["overall_eval"] = st.text_area(
                "⭐ Đánh giá tổng quan",
                value=st.session_state["overall_eval"],
                height=100,
                placeholder="Đánh giá chung tình hình tháng...",
            )
        with ib:
            st.markdown("**➕ Thêm công việc ngoài Excel:**")
            nt_name = st.text_input("Tên công việc")
            nt_person = st.text_input("Người phụ trách")
            nt_st = st.selectbox("Trạng thái", ["Hoàn thành", "Đang làm", "Chưa bắt đầu", "Rủi ro"])
            nt_note = st.text_input("Ghi chú")
            if st.button("➕ Thêm"):
                if nt_name:
                    st.session_state["extra_tasks"].append(
                        {"Công việc": nt_name, "Người phụ trách": nt_person, "Trạng thái": nt_st, "Ghi chú": nt_note}
                    )
                    st.success(f"Đã thêm: {nt_name}")

        if st.session_state["extra_tasks"]:
            st.markdown("**Danh sách bổ sung:**")
            et_df = pd.DataFrame(st.session_state["extra_tasks"])
            st.dataframe(et_df, use_container_width=True, hide_index=True)
            if st.button("🗑️ Xóa danh sách"):
                st.session_state["extra_tasks"] = []
                st.rerun()

        st.markdown("---")
        st.markdown(sec_title("📤", "EXPORT"), unsafe_allow_html=True)

        ea, eb, ec = st.columns(3)

        with ea:
            st.markdown("**📊 Excel tổng hợp**")
            xls_bytes = export_excel_bytes(df, col_map, st.session_state)
            st.download_button(
                "⬇️ Tải file Excel",
                data=xls_bytes,
                file_name=f"MKT_Report_{datetime.now().strftime('%Y%m%d')}.xlsx",
                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                use_container_width=True,
            )

        with eb:
            st.markdown("**🌐 HTML Dashboard**")
            html_str = export_html_str(df, col_map, st.session_state)
            st.download_button(
                "⬇️ Tải file HTML",
                data=html_str.encode("utf-8"),
                file_name=f"MKT_Dashboard_{datetime.now().strftime('%Y%m%d')}.html",
                mime="text/html",
                use_container_width=True,
            )

        with ec:
            st.markdown("**📋 Nội dung cho PowerPoint**")
            if st.button("Tạo nội dung copy", use_container_width=True):
                copy_txt = generate_copy_text(df, col_map, st.session_state)
                st.text_area("Copy nội dung này vào Canva / PowerPoint:", copy_txt, height=280)

    # ──────────────────────────────────────────────────────────
    # TAB 6 — CÀI ĐẶT CỘT
    # ──────────────────────────────────────────────────────────
    with t6:
        st.markdown(sec_title("⚙️", "MAP CỘT DỮ LIỆU"), unsafe_allow_html=True)

        raw_cols: list[str] = list(df_raw.columns)
        options = ["(Bỏ qua)"] + raw_cols

        st.info(
            "App đã cố tự nhận diện cột. "
            "Nếu dashboard trống hoặc sai, hãy chọn đúng cột bên dưới rồi nhấn **Lưu**."
        )

        auto_detected = [k for k in PRIORITY_COLUMNS if k in col_map]
        not_detected  = [k for k in PRIORITY_COLUMNS if k not in col_map]
        if auto_detected:
            st.success(f"✅ Đã tự nhận diện {len(auto_detected)} cột: {', '.join(auto_detected)}")
        if not_detected:
            st.warning(f"⚠️ Chưa nhận diện: {', '.join(not_detected)}")

        new_map: dict[str, str] = {}
        ca2, cb2 = st.columns(2)

        for i, std in enumerate(PRIORITY_COLUMNS):
            cur = col_map.get(std, "(Bỏ qua)")
            idx = options.index(cur) if cur in options else 0
            target = ca2 if i % 2 == 0 else cb2
            with target:
                sel = st.selectbox(f"**{std}**", options, index=idx, key=f"cm_{std}")
                if sel != "(Bỏ qua)":
                    new_map[std] = sel

        if st.button("💾 Lưu cài đặt cột", type="primary"):
            st.session_state["col_map"] = new_map
            st.success("✅ Đã lưu! Chuyển sang tab khác để xem dashboard.")
            st.rerun()

        st.markdown("---")
        st.markdown(sec_title("👀", "PREVIEW DỮ LIỆU GỐC"), unsafe_allow_html=True)
        st.caption(f"{len(df_raw)} dòng × {len(df_raw.columns)} cột")
        st.dataframe(df_raw.head(30).fillna(""), use_container_width=True)


# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    main()

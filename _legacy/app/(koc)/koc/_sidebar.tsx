"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "../../(protected)/actions";

const sections: { title: string; items: { href: string; icon: string; label: string; disabled?: boolean }[] }[] = [
  {
    title: "ĐIỀU HÀNH",
    items: [
      { href: "/koc", icon: "▦", label: "Tổng quan" },
      { href: "/koc/reports", icon: "📊", label: "Báo cáo", disabled: true },
    ],
  },
  {
    title: "VẬN HÀNH KOC",
    items: [
      { href: "/koc/leads", icon: "👥", label: "KOC Lead → Deal" },
      { href: "/koc/bookings", icon: "📋", label: "Booking Log" },
      { href: "/koc/classify", icon: "🏷", label: "Phân loại KOC", disabled: true },
      { href: "/koc/progress", icon: "📈", label: "Tiến độ tháng", disabled: true },
      { href: "/koc/okr", icon: "🎯", label: "OKR cá nhân", disabled: true },
      { href: "/koc/samples", icon: "📦", label: "Hàng mẫu", disabled: true },
      { href: "/koc/contracts", icon: "📄", label: "Hợp đồng", disabled: true },
    ],
  },
  {
    title: "NỘI DUNG & SP",
    items: [
      { href: "/koc/products", icon: "🛍", label: "Product Resource", disabled: true },
      { href: "/koc/brief", icon: "📝", label: "Brief sản phẩm", disabled: true },
      { href: "/koc/video-log", icon: "🎬", label: "Video Log", disabled: true },
    ],
  },
  {
    title: "DỮ LIỆU",
    items: [{ href: "/koc/raw", icon: "🗄", label: "Dữ liệu thô", disabled: true }],
  },
];

export default function KocSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <aside className="koc-sidebar">
      <div className="koc-brand">
        <div className="koc-brand-mark">👥</div>
        <div>
          <div className="koc-brand-title">KOC Hub</div>
          <div className="koc-brand-sub">SO5 Đà Nẵng</div>
        </div>
      </div>
      <nav className="koc-nav">
        {sections.map((sec) => (
          <div key={sec.title} className="koc-nav-section">
            <div className="koc-nav-title">{sec.title}</div>
            {sec.items.map((it) => {
              const active = pathname === it.href;
              const cls = `koc-nav-item ${active ? "is-active" : ""} ${it.disabled ? "is-disabled" : ""}`;
              if (it.disabled) {
                return (
                  <span key={it.href} className={cls} title="Sắp ra mắt">
                    <span className="koc-nav-icon">{it.icon}</span>
                    <span>{it.label}</span>
                  </span>
                );
              }
              return (
                <Link key={it.href} href={it.href} className={cls}>
                  <span className="koc-nav-icon">{it.icon}</span>
                  <span>{it.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="koc-user">
        <div className="koc-user-mark">{email.charAt(0).toUpperCase()}</div>
        <div className="koc-user-info">
          <div className="koc-user-name">{email.split("@")[0]}</div>
          <div className="koc-user-role">⊙ Quản lý</div>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="koc-logout" title="Đăng xuất">↗</button>
        </form>
      </div>
    </aside>
  );
}

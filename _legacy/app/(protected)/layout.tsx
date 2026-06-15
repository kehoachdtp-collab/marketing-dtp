import Link from "next/link";
import { requireActiveUser } from "@/lib/auth/require-user";
import { signOutAction } from "./actions";

const allMenus = [
  { href: "/dashboard", module: "dashboard", label: "Tổng quan" },
  { href: "/b2b", module: "b2b", label: "B2B" },
  { href: "/sale", module: "sale_online", label: "Sale Online" },
  { href: "/koc", module: "koc", label: "KOC Hub" },
  { href: "/recruitment", module: "recruitment", label: "Tuyển dụng" },
  { href: "/admin/users", module: "user_management", label: "Người dùng" },
  { href: "/admin/audit-logs", module: "audit_logs", label: "Lịch sử dữ liệu" },
  { href: "/admin/notifications", module: "admin_notifications", label: "Notifications" },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { profile, supabase } = await requireActiveUser();
  const isOwnerAdmin = profile.role === "owner" || profile.role === "admin";

  const { data: permissions } = isOwnerAdmin
    ? { data: [] }
    : await supabase.from("user_permissions").select("module,can_view").eq("user_id", profile.id);

  const visibleModules = new Set((permissions ?? []).filter((p) => p.can_view).map((p) => p.module));
  const menus = isOwnerAdmin ? allMenus : allMenus.filter((item) => visibleModules.has(item.module));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-title">MKT Dashboard</div>
            <div className="brand-sub">{profile.email}</div>
          </div>
        </div>
        <nav className="nav">
          {menus.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
        </nav>
        <form action={signOutAction}>
          <button className="btn" type="submit">Đăng xuất</button>
        </form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

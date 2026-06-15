import { requirePermission } from "@/lib/auth/permissions";
import KocSidebar from "./_sidebar";

export default async function KocLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePermission("koc", "view");
  return (
    <div className="koc-app">
      <KocSidebar email={ctx.profile.email} />
      <main className="koc-main">{children}</main>
    </div>
  );
}

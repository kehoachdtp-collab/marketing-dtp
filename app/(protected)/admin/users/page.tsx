import { requirePermission } from "@/lib/auth/permissions";
import { presetFromPermission, ROLE_OPTIONS, STATUS_OPTIONS, MODULE_PERMISSION_PRESETS, USER_ADMIN_PRESETS, AUDIT_PRESETS, type ModuleKey } from "@/lib/auth/permission-presets";
import { createUser, updateUserPermissions, resetUserPassword, toggleUserLock, deactivateUser } from "./actions";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string | null;
  last_login_at: string | null;
};

type PermissionRow = {
  user_id: string;
  module: ModuleKey;
  can_view: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_import: boolean;
  can_export: boolean;
  can_export_sensitive: boolean;
  can_restore: boolean;
  can_manage_users: boolean;
  can_reset_password: boolean;
};

function optionList(source: Record<string, { label: string }>) {
  return Object.entries(source).map(([value, item]) => <option key={value} value={value}>{item.label}</option>);
}

function roleLabel(role: string) {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role;
}

function statusBadge(status: string) {
  const label = STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
  const cls = status === "active" ? "badge" : status === "pending_password_change" ? "badge warn" : "badge danger";
  return <span className={cls}>{label}</span>;
}

function permissionSelect(name: string, module: ModuleKey, permissions: Map<string, PermissionRow>, disabled = false) {
  const source = module === "user_management" ? USER_ADMIN_PRESETS : module === "audit_logs" ? AUDIT_PRESETS : MODULE_PERMISSION_PRESETS;
  const value = presetFromPermission(module, permissions.get(module));
  return <select name={name} defaultValue={value} disabled={disabled}>{optionList(source)}</select>;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const ctx = await requirePermission("user_management", "view");
  const params = await searchParams;
  const message = typeof params.message === "string" ? params.message : null;
  const error = typeof params.error === "string" ? params.error : null;

  const { data: profiles } = await ctx.supabase
    .from("profiles")
    .select("id,email,full_name,role,status,created_at,last_login_at")
    .order("created_at", { ascending: true });

  const ids = (profiles ?? []).map((profile) => profile.id);
  const { data: permissionRows } = ids.length
    ? await ctx.supabase.from("user_permissions").select("*").in("user_id", ids)
    : { data: [] };

  const byUser = new Map<string, Map<string, PermissionRow>>();
  for (const row of (permissionRows ?? []) as PermissionRow[]) {
    if (!byUser.has(row.user_id)) byUser.set(row.user_id, new Map());
    byUser.get(row.user_id)!.set(row.module, row);
  }

  const currentUserAdminPermission = byUser.get(ctx.profile.id)?.get("user_management");
  const isOwnerAdmin = ctx.profile.role === "owner" || ctx.profile.role === "admin";
  const canManageUsers = isOwnerAdmin || Boolean(currentUserAdminPermission?.can_manage_users);
  const canResetPassword = isOwnerAdmin || Boolean(currentUserAdminPermission?.can_reset_password);

  return (
    <>
      <div className="topbar">
        <div>
          <h1 className="page-title">Người dùng</h1>
          <p className="page-subtitle">Chọn quyền theo module, lưu xuống user_permissions. RLS vẫn bảo vệ ở database.</p>
        </div>
      </div>
      {message ? <div className="card" style={{ marginBottom: 12 }}>{decodeURIComponent(message)}</div> : null}
      {error ? <div className="alert" style={{ marginBottom: 12 }}>{decodeURIComponent(error)}</div> : null}
      {canManageUsers ? (
        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="section-title">Tạo user</h2>
          <form action={createUser} className="filter-grid">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" placeholder="email@congty.com" required />
            </label>
            <label className="field">
              <span>Tên hiển thị</span>
              <input name="full_name" placeholder="Họ tên" />
            </label>
            <label className="field">
              <span>Vai trò</span>
              <select name="role" defaultValue="viewer">
                {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Mật khẩu tạm</span>
              <input name="temporary_password" type="password" placeholder="Bắt buộc đổi sau login" required />
            </label>
            <button className="btn primary" type="submit">Tạo user</button>
          </form>
          <p className="muted-text">User mới luôn ở trạng thái Chờ đổi mật khẩu và phải đổi mật khẩu trước khi vào dashboard.</p>
        </section>
      ) : null}
      <section className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Tên hiển thị</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th>B2B</th>
                <th>Sale Online</th>
                <th>Tuyển dụng</th>
                <th>User/Admin</th>
                <th>Audit</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {((profiles ?? []) as ProfileRow[]).map((profile) => {
                const permissions = byUser.get(profile.id) ?? new Map<string, PermissionRow>();
                const isOwner = profile.role === "owner";
                return (
                  <tr key={profile.id}>
                    <td>
                      <strong>{profile.email}</strong>
                      {isOwner ? <div><span className="badge">OWNER</span></div> : null}
                    </td>
                    {isOwner ? (
                      <>
                        <td>{profile.full_name || "-"}</td>
                        <td><span className="badge">{roleLabel(profile.role)}</span></td>
                        <td>{statusBadge(profile.status)}</td>
                        <td colSpan={5}><div className="readonly-cell">Toàn quyền hệ thống. Permission của owner là readonly.</div></td>
                        <td><div className="readonly-cell">Không cho admin sửa/reset/khóa/xóa owner.</div></td>
                      </>
                    ) : (
                      <>
                        <td colSpan={8} style={{ padding: 0 }}>
                          <form action={updateUserPermissions}>
                            <input type="hidden" name="user_id" value={profile.id} />
                            <table style={{ minWidth: 900, border: 0 }}>
                              <tbody>
                                <tr>
                                  <td><input name="full_name" defaultValue={profile.full_name ?? ""} placeholder="Tên hiển thị" disabled={!canManageUsers} /></td>
                                  <td>
                                    <select name="role" defaultValue={profile.role} disabled={!canManageUsers}>
                                      {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                    </select>
                                  </td>
                                  <td>
                                    <select name="status" defaultValue={profile.status} disabled={!canManageUsers}>
                                      {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                    </select>
                                  </td>
                                  <td>{permissionSelect("perm_b2b", "b2b", permissions, !canManageUsers)}</td>
                                  <td>{permissionSelect("perm_sale_online", "sale_online", permissions, !canManageUsers)}</td>
                                  <td>{permissionSelect("perm_recruitment", "recruitment", permissions, !canManageUsers)}</td>
                                  <td>{permissionSelect("perm_user_management", "user_management", permissions, !canManageUsers)}</td>
                                  <td>{permissionSelect("perm_audit_logs", "audit_logs", permissions, !canManageUsers)}</td>
                                  <td>{canManageUsers ? <button className="btn primary" type="submit">Lưu quyền</button> : <span className="muted-text">Chỉ xem</span>}</td>
                                </tr>
                              </tbody>
                            </table>
                          </form>
                        </td>
                        <td>
                          <div className="row-actions">
                            {canResetPassword ? (
                              <form action={resetUserPassword} className="permissions-grid">
                                <input type="hidden" name="user_id" value={profile.id} />
                                <input name="temporary_password" type="password" placeholder="Mật khẩu tạm" />
                                <button className="btn" type="submit">Reset mật khẩu</button>
                              </form>
                            ) : null}
                            {canManageUsers ? (
                              <>
                                <form action={toggleUserLock}>
                                  <input type="hidden" name="user_id" value={profile.id} />
                                  <button className="btn" type="submit">{profile.status === "blocked" ? "Mở" : "Khóa"}</button>
                                </form>
                                <form action={deactivateUser}>
                                  <input type="hidden" name="user_id" value={profile.id} />
                                  <button className="btn danger" type="submit">Xóa user</button>
                                </form>
                              </>
                            ) : null}
                            {!canResetPassword && !canManageUsers ? <span className="muted-text">Chỉ xem</span> : null}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

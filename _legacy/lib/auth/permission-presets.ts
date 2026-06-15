export const ROLE_OPTIONS = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "b2b", label: "Nh?n s? B2B" },
  { value: "sale_online", label: "Nh?n s? Sale Online" },
  { value: "recruitment", label: "Nh?n s? Tuy?n d?ng" },
  { value: "viewer", label: "Viewer" },
] as const;

export const STATUS_OPTIONS = [
  { value: "active", label: "?ang ho?t ??ng" },
  { value: "pending_password_change", label: "Ch? ??i m?t kh?u" },
  { value: "blocked", label: "T?m kh?a" },
  { value: "inactive", label: "Ngh? vi?c" },
] as const;

export const MODULE_KEYS = ["dashboard", "b2b", "sale_online", "recruitment", "koc", "user_management", "audit_logs", "settings"] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];
export type PermissionAction = "view" | "create" | "update" | "delete" | "import" | "export" | "export_sensitive" | "restore" | "manage_users" | "reset_password";

export type PermissionShape = {
  can_view?: boolean;
  can_create?: boolean;
  can_update?: boolean;
  can_delete?: boolean;
  can_import?: boolean;
  can_export?: boolean;
  can_export_sensitive?: boolean;
  can_restore?: boolean;
  can_manage_users?: boolean;
  can_reset_password?: boolean;
};

const empty: Required<PermissionShape> = {
  can_view: false,
  can_create: false,
  can_update: false,
  can_delete: false,
  can_import: false,
  can_export: false,
  can_export_sensitive: false,
  can_restore: false,
  can_manage_users: false,
  can_reset_password: false,
};

export const MODULE_PERMISSION_PRESETS = {
  none: { label: "Kh?ng truy c?p", value: { ...empty } },
  view: { label: "Ch? xem", value: { ...empty, can_view: true } },
  edit: { label: "Xem + s?a", value: { ...empty, can_view: true, can_create: true, can_update: true } },
  import: { label: "Xem + s?a + import", value: { ...empty, can_view: true, can_create: true, can_update: true, can_import: true } },
  full: { label: "To?n quy?n module", value: { ...empty, can_view: true, can_create: true, can_update: true, can_delete: true, can_import: true, can_export: true, can_restore: true } },
} as const;

export const USER_ADMIN_PRESETS = {
  none: { label: "Kh?ng truy c?p", value: { ...empty } },
  view: { label: "Ch? xem user", value: { ...empty, can_view: true } },
  manage: { label: "Qu?n l? user", value: { ...empty, can_view: true, can_create: true, can_update: true, can_manage_users: true } },
  reset: { label: "Reset m?t kh?u", value: { ...empty, can_view: true, can_reset_password: true } },
  full: { label: "To?n quy?n admin", value: { ...empty, can_view: true, can_create: true, can_update: true, can_delete: true, can_restore: true, can_manage_users: true, can_reset_password: true } },
} as const;

export const AUDIT_PRESETS = {
  none: { label: "Kh?ng truy c?p", value: { ...empty } },
  view: { label: "Xem l?ch s?", value: { ...empty, can_view: true } },
} as const;

export function mergePermission(module: ModuleKey, preset: string) {
  if (module === "user_management") {
    if (!(preset in USER_ADMIN_PRESETS)) throw new Error("Preset User/Admin kh?ng h?p l?.");
    return USER_ADMIN_PRESETS[preset as keyof typeof USER_ADMIN_PRESETS].value;
  }
  if (module === "audit_logs") {
    if (!(preset in AUDIT_PRESETS)) throw new Error("Preset Audit kh?ng h?p l?.");
    return AUDIT_PRESETS[preset as keyof typeof AUDIT_PRESETS].value;
  }
  if (!(preset in MODULE_PERMISSION_PRESETS)) throw new Error("Preset module kh?ng h?p l?.");
  return MODULE_PERMISSION_PRESETS[preset as keyof typeof MODULE_PERMISSION_PRESETS].value;
}

export function presetFromPermission(module: ModuleKey, permission?: PermissionShape | null) {
  const p = { ...empty, ...(permission ?? {}) };
  const source = module === "user_management" ? USER_ADMIN_PRESETS : module === "audit_logs" ? AUDIT_PRESETS : MODULE_PERMISSION_PRESETS;
  for (const [key, preset] of Object.entries(source)) {
    const value = preset.value;
    if (Object.keys(empty).every((field) => Boolean(p[field as keyof PermissionShape]) === Boolean(value[field as keyof PermissionShape]))) {
      return key;
    }
  }
  return "none";
}

export function isRole(value: string) {
  return ROLE_OPTIONS.some((role) => role.value === value);
}

export function isStatus(value: string) {
  return STATUS_OPTIONS.some((status) => status.value === value);
}

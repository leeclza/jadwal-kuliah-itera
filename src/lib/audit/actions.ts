/** Satu-satunya sumber string action/category/target audit. Jangan tulis string mentah di tempat lain. */

export const AuditCategory = {
  AUTH: "AUTH",
  PROFILE: "PROFILE",
  SCHEDULE: "SCHEDULE",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
  SECURITY: "SECURITY",
} as const;
export type AuditCategory = (typeof AuditCategory)[keyof typeof AuditCategory];

export const AuditTargetType = {
  USER: "User",
  SCHEDULE: "Schedule",
  SEMESTER: "Semester",
  ATTENDANCE: "Attendance",
  AUDIT_LOG: "AuditLog",
} as const;
export type AuditTargetType = (typeof AuditTargetType)[keyof typeof AuditTargetType];

/** Jenis badge/ikon di UI. */
export type AuditKind = "create" | "update" | "delete" | "generate" | "sync" | "export" | "login" | "logout" | "security" | "view";

type ActionDef = { category: AuditCategory; label: string; kind: AuditKind };

const def = (category: AuditCategory, label: string, kind: AuditKind): ActionDef => ({ category, label, kind });

export const AUDIT_ACTIONS = {
  AUTH_LOGIN: def("AUTH", "Login", "login"),
  AUTH_LOGOUT: def("AUTH", "Logout", "logout"),
  AUTH_LOGIN_FAILED: def("SECURITY", "Login Ditolak", "security"),

  PROFILE_CREATE: def("PROFILE", "Buat Profil", "create"),
  PROFILE_UPDATE: def("PROFILE", "Ubah Profil", "update"),

  SEMESTER_CREATE: def("PROFILE", "Tambah Semester", "create"),
  SEMESTER_UPDATE: def("PROFILE", "Ubah Semester", "update"),
  SEMESTER_DELETE: def("PROFILE", "Hapus Semester", "delete"),

  SCHEDULE_GENERATE: def("SCHEDULE", "Generate Jadwal", "generate"),
  SCHEDULE_SYNC: def("SCHEDULE", "Sync SIAKAD", "sync"),
  SCHEDULE_SIAKAD_UPDATE: def("SCHEDULE", "Update SIAKAD", "sync"),
  SCHEDULE_CREATE: def("SCHEDULE", "Tambah Jadwal", "create"),
  SCHEDULE_UPDATE: def("SCHEDULE", "Ubah Jadwal", "update"),
  SCHEDULE_DELETE: def("SCHEDULE", "Hapus Jadwal", "delete"),
  SCHEDULE_DELETE_ALL: def("SCHEDULE", "Hapus Semua Jadwal", "delete"),
  SCHEDULE_MANUAL_CREATE: def("SCHEDULE", "Tambah Jadwal Manual", "create"),
  SCHEDULE_MANUAL_UPDATE: def("SCHEDULE", "Ubah Jadwal Manual", "update"),
  SCHEDULE_MANUAL_DELETE: def("SCHEDULE", "Hapus Jadwal Manual", "delete"),
  SCHEDULE_COPY: def("SCHEDULE", "Salin Jadwal", "create"),
  SCHEDULE_RESOLVE: def("SCHEDULE", "Konfirmasi Kelas", "update"),
  SCHEDULE_EXPORT_XLSX: def("SCHEDULE", "Export XLSX", "export"),
  SCHEDULE_CONFLICT_DETECTED: def("SCHEDULE", "Jadwal Bentrok", "security"),

  ATTENDANCE_UPDATE: def("SCHEDULE", "Ubah Presensi", "update"),

  ADMIN_VIEW_AUDIT_LOG: def("ADMIN", "Lihat Audit Log", "view"),
  ADMIN_VIEW_USER: def("ADMIN", "Lihat User", "view"),
  ADMIN_UPDATE_USER: def("ADMIN", "Ubah User", "update"),

  SECURITY_ACCESS_DENIED: def("SECURITY", "Akses Ditolak", "security"),
  SYSTEM_ERROR: def("SYSTEM", "Error Sistem", "security"),
} as const satisfies Record<string, ActionDef>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;
export const AuditAction = Object.fromEntries(Object.keys(AUDIT_ACTIONS).map((k) => [k, k])) as {
  [K in AuditAction]: K;
};

export const AUDIT_ACTION_KEYS = Object.keys(AUDIT_ACTIONS) as AuditAction[];
export const AUDIT_CATEGORY_KEYS = Object.values(AuditCategory);

export const isAuditAction = (v: string): v is AuditAction => v in AUDIT_ACTIONS;
export const isAuditCategory = (v: string): v is AuditCategory => (AUDIT_CATEGORY_KEYS as string[]).includes(v);

/** Label badge (singkat) per jenis. */
export const KIND_LABEL: Record<AuditKind, string> = {
  create: "Tambah Data",
  update: "Ubah Data",
  delete: "Hapus Data",
  generate: "Generate",
  sync: "Sync",
  export: "Export",
  login: "Login",
  logout: "Logout",
  security: "Security",
  view: "Lihat",
};

export function kindOf(action: string): AuditKind {
  return isAuditAction(action) ? AUDIT_ACTIONS[action].kind : "security";
}

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  AUTH: "Autentikasi",
  PROFILE: "Profil",
  SCHEDULE: "Jadwal",
  ADMIN: "Admin",
  SYSTEM: "Sistem",
  SECURITY: "Keamanan",
};

/** Label role yang tampil di UI (actorRole disimpan apa adanya). */
export const ROLE_LABEL: Record<string, string> = { OWNER: "Pemilik", ADMIN: "Admin", MAHASISWA: "Mahasiswa" };

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Fake DB & session (tanpa Postgres) ----
const db = vi.hoisted(() => {
  const auditLogs: Record<string, unknown>[] = [];
  const items = new Map<string, Record<string, unknown>>();
  let seq = 0;
  const base = {
    type: "COURSE", source: "MANUAL", courseCode: null, courseName: null, className: null, room: null,
    lecturers: [], sks: null, day: null, startTime: null, endTime: null, notes: null, sourceId: null,
    isManual: true, matchStatus: "MATCHED", candidates: null,
  };
  const client = {
    auditLog: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        auditLogs.push(data);
        return { id: `log${auditLogs.length}` };
      }),
    },
    scheduleItem: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const it = { ...base, ...data, id: `s${++seq}` };
        items.set(it.id as string, it);
        return it;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const it = { ...items.get(where.id), ...data };
        items.set(where.id, it);
        return it;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const it = items.get(where.id);
        items.delete(where.id);
        return it;
      }),
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        const it = items.get(where.id);
        return it && it.userId === where.userId ? it : null;
      }),
      findMany: vi.fn(async ({ where }: { where?: { id?: { not?: string } } } = {}) =>
        [...items.values()].filter((i) => i.id !== where?.id?.not)),
    },
    semester: {
      findFirst: vi.fn(async () => ({ id: "sem1", userId: "u1", number: 3, label: null })),
    },
    user: { findUnique: vi.fn(), update: vi.fn(async () => ({})) },
    $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(client)),
  };
  return { client, auditLogs, items };
});

const session = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock("@/lib/db/prisma", () => ({ prisma: db.client }));
vi.mock("@/lib/auth/session", () => {
  class UnauthorizedError extends Error {}
  return {
    UnauthorizedError,
    requireUserApi: vi.fn(async () => {
      if (!session.current) throw new UnauthorizedError();
      return session.current;
    }),
  };
});
vi.mock("@/lib/schedule/sync-service", () => ({
  syncSiakadSchedules: vi.fn(async () => ({ added: 2, updated: 5, removed: 1, manualKept: 3, needsConfirmation: 0 })),
}));
vi.mock("@/lib/export/xlsx", () => ({
  buildScheduleWorkbook: vi.fn(async () => Buffer.from("xlsx")),
  exportFileName: () => "jadwal.xlsx",
}));
vi.mock("@/lib/admin/stats", () => ({ getAdminStats: vi.fn() }));

import { OWNER_EMAIL } from "@/lib/auth/admin";
import { AUDIT_ACTIONS, AuditAction } from "@/lib/audit/actions";
import { buildAuditData, requestContext } from "@/lib/audit/audit.service";
import { recordLogin, recordLogout } from "@/lib/audit/auth";
import { changedFields, diffRows, sanitize } from "@/lib/audit/format";
import { buildAuditWhere, parseAuditFilters } from "@/lib/audit/query";
import * as scheduleRoute from "@/app/api/schedule/route";
import * as scheduleIdRoute from "@/app/api/schedule/[id]/route";
import * as syncRoute from "@/app/api/schedule/sync/route";
import * as exportRoute from "@/app/api/export/route";
import * as auditRoute from "@/app/api/admin/audit-logs/route";
import * as roleRoute from "@/app/api/admin/users/[id]/role/route";

const student = {
  id: "u1", name: "Christopher Leon Saputra", email: "christopher.124140097@student.itera.ac.id",
  nim: "124140097", role: "MAHASISWA", activeSemesterId: "sem1",
};
const plainStudent = { ...student, id: "u2", name: "Budi", email: "budi.1@student.itera.ac.id" };

const req = (method: string, body?: unknown, url = "http://localhost/api/x") =>
  new Request(url, {
    method,
    headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1, 1.1.1.1", "user-agent": "vitest" },
    body: body ? JSON.stringify(body) : undefined,
  });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const lastLog = () => db.auditLogs.at(-1)!;

const praktikum = { type: "PRACTICUM", title: "Praktikum PBO", day: 3, startTime: "10:00", endTime: "12:30", room: "LABTEK 3 LT.3" };

beforeEach(() => {
  db.auditLogs.length = 0;
  db.items.clear();
  session.current = plainStudent;
});

describe("audit: jadwal", () => {
  it("1. membuat jadwal -> audit CREATE dengan afterData", async () => {
    const res = await scheduleRoute.POST(req("POST", praktikum));
    expect(res.status).toBe(201);
    const log = lastLog();
    expect(log.action).toBe(AuditAction.SCHEDULE_MANUAL_CREATE);
    expect(log.category).toBe("SCHEDULE");
    expect(log.actorId).toBe("u2");
    expect(log.actorName).toBe("Budi");
    expect(log.actorRole).toBe("MAHASISWA");
    expect(log.description).toBe("Budi menambahkan jadwal manual: Praktikum PBO");
    expect(log.targetName).toBe("Praktikum PBO");
    expect(log.afterData).toMatchObject({ title: "Praktikum PBO", day: "Rabu", startTime: "10:00", room: "LABTEK 3 LT.3" });
    expect(log.ipAddress).toBe("10.0.0.1");
    expect(log.userAgent).toBe("vitest");
  });

  it("2. mengubah jadwal -> beforeData & afterData hanya field yang berubah", async () => {
    await scheduleRoute.POST(req("POST", praktikum));
    const id = [...db.items.keys()][0];
    await scheduleIdRoute.PATCH(req("PATCH", { ...praktikum, startTime: "10:30", endTime: "13:00" }), ctx(id));
    const log = lastLog();
    expect(log.action).toBe(AuditAction.SCHEDULE_MANUAL_UPDATE);
    expect(log.beforeData).toEqual({ startTime: "10:00", endTime: "12:30" });
    expect(log.afterData).toEqual({ startTime: "10:30", endTime: "13:00" });
  });

  it("3. menghapus jadwal -> beforeData berisi snapshot", async () => {
    await scheduleRoute.POST(req("POST", praktikum));
    const id = [...db.items.keys()][0];
    await scheduleIdRoute.DELETE(req("DELETE"), ctx(id));
    const log = lastLog();
    expect(log.action).toBe(AuditAction.SCHEDULE_MANUAL_DELETE);
    expect(log.beforeData).toMatchObject({ title: "Praktikum PBO", room: "LABTEK 3 LT.3" });
    expect(log.targetId).toBe(id);
  });

  it("jadwal bentrok -> SCHEDULE_CONFLICT_DETECTED", async () => {
    await scheduleRoute.POST(req("POST", praktikum));
    await scheduleRoute.POST(req("POST", { ...praktikum, title: "Kalkulus", startTime: "11:00", endTime: "12:00" }));
    const log = lastLog();
    expect(log.action).toBe(AuditAction.SCHEDULE_CONFLICT_DETECTED);
    expect(log.metadata).toMatchObject({ day: "Rabu" });
  });

  it("audit gagal -> mutasi ikut gagal (satu transaksi)", async () => {
    db.client.auditLog.create.mockRejectedValueOnce(new Error("db down"));
    const res = await scheduleRoute.POST(req("POST", praktikum));
    expect(res.status).toBe(500);
  });

  it("5. sync SIAKAD -> SCHEDULE_SYNC dengan ringkasan, tanpa teks mentah", async () => {
    await syncRoute.POST(req("POST", { mode: "siakad", text: "RAHASIA SIAKAD" }));
    const log = lastLog();
    expect(log.action).toBe(AuditAction.SCHEDULE_SYNC);
    expect(log.description).toBe("Budi memperbarui jadwal dari SIAKAD");
    expect(log.metadata).toMatchObject({ status: "SUCCESS", semester: 3, added: 2, updated: 5, removed: 1, manualPreserved: 3 });
    expect(JSON.stringify(log)).not.toContain("RAHASIA");
  });

  it("5b. sync gagal -> metadata FAILED", async () => {
    const { syncSiakadSchedules } = await import("@/lib/schedule/sync-service");
    vi.mocked(syncSiakadSchedules).mockRejectedValueOnce(new Error("SIAKAD tidak dapat diakses"));
    await syncRoute.POST(req("POST", { mode: "refresh" }));
    expect(lastLog().metadata).toMatchObject({ status: "FAILED", reason: "SIAKAD tidak dapat diakses" });
  });

  it("6. export XLSX -> SCHEDULE_EXPORT_XLSX tanpa file binary", async () => {
    const res = await exportRoute.GET(req("GET"));
    expect(res.status).toBe(200);
    const log = lastLog();
    expect(log.action).toBe(AuditAction.SCHEDULE_EXPORT_XLSX);
    expect(log.metadata).toEqual({ format: "xlsx", semester: 3, totalSchedules: 0 });
  });
});

describe("audit: autentikasi", () => {
  it("7. login -> AUTH_LOGIN", async () => {
    await recordLogin(student);
    expect(lastLog()).toMatchObject({ action: "AUTH_LOGIN", category: "AUTH", description: "Christopher Leon Saputra masuk ke sistem" });
    expect(lastLog().metadata).toMatchObject({ provider: "google" });
  });
  it("8. logout -> AUTH_LOGOUT", async () => {
    await recordLogout(student);
    expect(lastLog()).toMatchObject({ action: "AUTH_LOGOUT", description: "Christopher Leon Saputra keluar dari sistem" });
  });
  it("logging best-effort tidak melempar walau DB gagal", async () => {
    db.client.auditLog.create.mockRejectedValueOnce(new Error("x"));
    await expect(recordLogin(student)).resolves.toBeUndefined();
  });
});

describe("audit: akses admin", () => {
  it("9. admin bisa membaca audit log", async () => {
    session.current = { ...student, email: OWNER_EMAIL };
    const spy = vi.spyOn(await import("@/lib/audit/query"), "listAuditLogs");
    // listAuditLogs memakai prisma.auditLog.count/findMany -> tambahkan ke fake
    Object.assign(db.client.auditLog, { count: vi.fn(async () => 0), findMany: vi.fn(async () => []) });
    const res = await auditRoute.GET(req("GET", undefined, "http://localhost/api/admin/audit-logs?role=ADMIN"));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ total: 0, rows: [], page: 1 });
    spy.mockRestore();
  });
  it("10. user biasa GET /api/admin/audit-logs -> 403", async () => {
    const res = await auditRoute.GET(req("GET", undefined, "http://localhost/api/admin/audit-logs"));
    expect(res.status).toBe(403);
  });
  it("11. admin mengubah user lain -> actor = admin, target = user", async () => {
    session.current = { ...student, email: OWNER_EMAIL, name: "Admin Dev" };
    db.client.user.findUnique.mockResolvedValueOnce({ id: "u2", email: plainStudent.email, name: "Budi", role: "MAHASISWA" });
    db.client.user.update.mockResolvedValueOnce({ id: "u2", role: "ADMIN" });
    const res = await roleRoute.PATCH(req("PATCH", { role: "ADMIN" }), ctx("u2"));
    expect(res.status).toBe(200);
    const log = lastLog();
    expect(log).toMatchObject({ action: "ADMIN_UPDATE_USER", category: "ADMIN", actorName: "Admin Dev", actorRole: "ADMIN", targetId: "u2", targetName: "Budi" });
    expect(log.beforeData).toEqual({ role: "MAHASISWA" });
    expect(log.afterData).toEqual({ role: "ADMIN" });
  });
  it("12 & 13. audit log tidak bisa dibuat/diubah/dihapus dari frontend", async () => {
    session.current = { ...student, email: OWNER_EMAIL };
    for (const m of ["POST", "PUT", "PATCH", "DELETE"] as const) {
      const res = await auditRoute[m]();
      expect(res.status).toBe(405);
    }
    expect(db.auditLogs).toHaveLength(0);
  });
});

describe("audit: helper", () => {
  it("sanitize membuang password/token/cookie/secret", () => {
    const out = sanitize({ name: "a", password: "x", access_token: "t", refreshToken: "r", sessionCookie: "c", apiKey: "k", nested: { client_secret: "s", ok: 1 } });
    expect(out).toEqual({ name: "a", nested: { ok: 1 } });
  });
  it("snapshot actor tetap walau nama berubah kemudian", () => {
    const data = buildAuditData(
      { actor: student, action: "PROFILE_UPDATE", description: "x" },
      requestContext(null),
    );
    expect(data).toMatchObject({ actorName: "Christopher Leon Saputra", actorEmail: student.email, category: AUDIT_ACTIONS.PROFILE_UPDATE.category });
  });
  it("diff: hanya field yang berubah; CREATE/DELETE menampilkan satu sisi", () => {
    expect(changedFields({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ before: { b: 2 }, after: { b: 3 }, changed: true });
    expect(diffRows({ startTime: "10:00", room: "L3" }, { startTime: "10:30", room: "L3" })).toEqual([
      { field: "startTime", label: "Jam Mulai", before: "10:00", after: "10:30" },
    ]);
    expect(diffRows(null, { room: "L3" })[0]).toMatchObject({ before: "—", after: "L3" });
  });
  it("filter diparse aman & tanggal pakai WIB", () => {
    const f = parseAuditFilters(new URLSearchParams("role=ADMIN&action=HACK&category=SCHEDULE&from=2026-09-30&to=2026-09-30&page=-3&q=124140097"));
    expect(f).toMatchObject({ role: "ADMIN", action: undefined, category: "SCHEDULE", page: 1 });
    const where = buildAuditWhere(f) as { AND: Record<string, unknown>[] };
    const range = where.AND.find((c) => "createdAt" in c)!.createdAt as { gte: Date; lt: Date };
    expect(range.gte.toISOString()).toBe("2026-09-29T17:00:00.000Z");
    expect(range.lt.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(JSON.stringify(where)).toContain('"path":["nim"]');
  });
});

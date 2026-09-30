import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AUDIT_ACTIONS, isAuditAction, isAuditCategory, type AuditAction, type AuditCategory } from "./actions";

export const PAGE_SIZE = 50;
const ROLES = ["ADMIN", "MAHASISWA"] as const;
const TZ_OFFSET = "+07:00"; // Asia/Jakarta, tanpa DST

export interface AuditFilters {
  role?: (typeof ROLES)[number];
  action?: AuditAction;
  category?: AuditCategory;
  targetType?: string;
  actorId?: string;
  from?: string; // YYYY-MM-DD (WIB)
  to?: string;
  q?: string;
  page: number;
}

type Params = Record<string, string | string[] | undefined> | URLSearchParams;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse query string -> filter tervalidasi (nilai asing diabaikan). */
export function parseAuditFilters(params: Params): AuditFilters {
  const get = (k: string) => {
    const v = params instanceof URLSearchParams ? params.get(k) : params[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const role = get("role");
  const action = get("action");
  const category = get("category");
  const from = get("from");
  const to = get("to");
  const page = Number.parseInt(get("page") ?? "1", 10);
  return {
    role: ROLES.find((r) => r === role),
    action: action && isAuditAction(action) ? action : undefined,
    category: category && isAuditCategory(category) ? category : undefined,
    targetType: get("targetType")?.slice(0, 40),
    actorId: get("actorId")?.slice(0, 40),
    from: from && DATE.test(from) ? from : undefined,
    to: to && DATE.test(to) ? to : undefined,
    q: get("q")?.slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}

/** Awal hari (WIB) dalam UTC. */
export const startOfDayWib = (ymd: string) => new Date(`${ymd}T00:00:00${TZ_OFFSET}`);

export function todayWib(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

export function buildAuditWhere(f: AuditFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [];
  if (f.role) and.push({ actorRole: f.role });
  if (f.action) and.push({ action: f.action });
  if (f.category) and.push({ category: f.category });
  if (f.targetType) and.push({ targetType: f.targetType });
  if (f.actorId) and.push({ actorId: f.actorId });
  if (f.from || f.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (f.from) createdAt.gte = startOfDayWib(f.from);
    if (f.to) createdAt.lt = new Date(startOfDayWib(f.to).getTime() + 24 * 3600 * 1000);
    and.push({ createdAt });
  }
  if (f.q) {
    const contains = { contains: f.q, mode: "insensitive" as const };
    const or: Prisma.AuditLogWhereInput[] = [
      { actorName: contains },
      { actorEmail: contains },
      { targetName: contains },
      { description: contains },
    ];
    // NIM mahasiswa ITERA ada di email (nama.NIM@student.itera.ac.id) & metadata.nim
    if (/^\d{5,12}$/.test(f.q)) or.push({ metadata: { path: ["nim"], equals: f.q } });
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}

/** Kolom yang dikirim ke UI (tanpa SELECT *). */
export const auditListSelect = {
  id: true, actorId: true, actorName: true, actorEmail: true, actorRole: true,
  action: true, category: true, description: true, targetType: true, targetId: true, targetName: true,
  beforeData: true, afterData: true, metadata: true, ipAddress: true, userAgent: true, createdAt: true,
} satisfies Prisma.AuditLogSelect;

export async function listAuditLogs(f: AuditFilters) {
  const where = buildAuditWhere(f);
  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      select: auditListSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  return { total, rows, page: f.page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

const MUTATION_ACTIONS = (Object.keys(AUDIT_ACTIONS) as AuditAction[]).filter((a) =>
  ["create", "update", "delete", "generate", "sync"].includes(AUDIT_ACTIONS[a].kind),
);

export async function getAuditStats(now = new Date()) {
  const today = { gte: startOfDayWib(todayWib(now)) };
  const [total, todayCount, activeUsers, changesToday] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.count({ where: { createdAt: today } }),
    prisma.auditLog.groupBy({ by: ["actorId"], where: { createdAt: today, actorId: { not: null } } }),
    prisma.auditLog.count({ where: { createdAt: today, action: { in: MUTATION_ACTIONS } } }),
  ]);
  return { total, today: todayCount, activeUsers: activeUsers.length, changesToday };
}

export type AuditRow = Awaited<ReturnType<typeof listAuditLogs>>["rows"][number];

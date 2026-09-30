import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isAdmin } from "@/lib/auth/admin";
import { AUDIT_ACTIONS, type AuditAction, type AuditCategory, type AuditTargetType } from "./actions";
import { sanitize } from "./format";

/** Client Prisma biasa atau `tx` dari $transaction -> audit ikut transaksi. */
type Db = Pick<Prisma.TransactionClient, "auditLog">;

export type AuditActor = { id: string; name?: string | null; email: string; role?: string | null } | null;

export interface AuditInput {
  actor: AuditActor;
  action: AuditAction;
  /** Default: kategori bawaan action. */
  category?: AuditCategory;
  description: string;
  targetType?: AuditTargetType;
  targetId?: string | null;
  targetName?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: Record<string, unknown> | null;
  /** Request asal (untuk IP & user agent). Jika kosong, diambil dari headers() Next bila tersedia. */
  request?: Request | Headers | null;
}

export const actorName = (a: AuditActor) => (a ? a.name?.trim() || a.email : "Sistem");
export const actorRole = (a: AuditActor) => (a ? (isAdmin(a) ? "ADMIN" : "MAHASISWA") : null);

export function requestContext(h: Headers | null | undefined) {
  if (!h) return { ipAddress: null, userAgent: null };
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: (fwd || h.get("x-real-ip") || null)?.slice(0, 64) ?? null,
    userAgent: h.get("user-agent")?.slice(0, 500) ?? null,
  };
}

async function resolveHeaders(req: AuditInput["request"]): Promise<Headers | null> {
  if (req instanceof Headers) return req;
  if (req) return req.headers;
  try {
    const { headers } = await import("next/headers");
    return new Headers(await headers());
  } catch {
    return null; // di luar request scope (test, script)
  }
}

const json = (v: unknown) =>
  v === undefined || v === null ? Prisma.DbNull : (sanitize(v) as Prisma.InputJsonValue);

export function buildAuditData(input: AuditInput, ctx: { ipAddress: string | null; userAgent: string | null }) {
  const { actor } = input;
  return {
    actorId: actor?.id ?? null,
    actorName: actor ? actorName(actor) : null,
    actorEmail: actor?.email ?? null,
    actorRole: actorRole(actor),
    action: input.action,
    category: input.category ?? AUDIT_ACTIONS[input.action].category,
    description: input.description.slice(0, 1000),
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    targetName: input.targetName?.slice(0, 300) ?? null,
    beforeData: json(input.beforeData),
    afterData: json(input.afterData),
    metadata: json(input.metadata),
    ...ctx,
  };
}

/**
 * Tulis audit log. Melempar error -> untuk operasi penting, panggil dengan `tx`
 * di dalam $transaction supaya mutasi ikut gagal jika audit gagal.
 */
export async function createAuditLog(input: AuditInput, db: Db = prisma) {
  const ctx = requestContext(await resolveHeaders(input.request));
  return db.auditLog.create({ data: buildAuditData(input, ctx), select: { id: true } });
}

/** Best-effort: untuk aktivitas non-kritis (login, export, view). Tidak pernah melempar. */
export async function logSafe(input: AuditInput) {
  try {
    await createAuditLog(input);
  } catch (err) {
    console.error("[audit]", err instanceof Error ? err.message : "unknown error");
  }
}

export const auditService = { log: createAuditLog, logSafe };

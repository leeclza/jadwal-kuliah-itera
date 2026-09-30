import { NextResponse } from "next/server";
import { HttpError, withErrors } from "@/lib/api";
import { isAdmin } from "@/lib/auth/admin";
import { requireUserApi } from "@/lib/auth/session";
import { getAuditStats, listAuditLogs, parseAuditFilters } from "@/lib/audit/query";

/** Admin only: daftar audit log dengan filter & pagination server-side. */
export const GET = withErrors(async (req: Request) => {
  const me = await requireUserApi();
  if (!isAdmin(me)) throw new HttpError(403, "Khusus admin.");
  const url = new URL(req.url);
  const filters = parseAuditFilters(url.searchParams);
  const [list, stats] = await Promise.all([
    listAuditLogs(filters),
    url.searchParams.get("stats") === "1" ? getAuditStats() : Promise.resolve(undefined),
  ]);
  return NextResponse.json({ ...list, stats }, { headers: { "Cache-Control": "no-store" } });
});

/**
 * Audit log hanya dibuat oleh server (auditService) saat aksi bisnis terjadi.
 * Tidak ada create/update/delete dari frontend.
 */
const readOnly = withErrors(async () => {
  throw new HttpError(405, "Audit log hanya bisa dibaca.");
});
export const POST = readOnly;
export const PUT = readOnly;
export const PATCH = readOnly;
export const DELETE = readOnly;

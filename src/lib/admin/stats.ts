import type { Prisma } from "@prisma/client";
import { OWNER_EMAIL } from "@/lib/auth/admin";
import { prisma } from "@/lib/db/prisma";

/** Tab terbuka kirim heartbeat tiap 20 detik, jadi "online" = heartbeat dalam 45 detik terakhir. */
export const ACTIVE_WINDOW_MS = 45 * 1000;

export type AdminStats = { total: number; mahasiswa: number; admin: number; aktif: number };

export async function getAdminStats(): Promise<AdminStats> {
  const adminWhere: Prisma.UserWhereInput = { OR: [{ role: "ADMIN" }, { email: { equals: OWNER_EMAIL, mode: "insensitive" } }] };
  const [total, admin, aktif] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: adminWhere }),
    prisma.user.count({ where: { onlineAt: { gte: new Date(Date.now() - ACTIVE_WINDOW_MS) } } }),
  ]);
  return { total, mahasiswa: total - admin, admin, aktif };
}

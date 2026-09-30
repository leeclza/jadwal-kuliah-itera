import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Di dev, client yang di-cache bisa berasal dari sebelum `prisma generate`
// (model baru belum ada) -> buat ulang supaya tidak perlu restart server.
const cached: PrismaClient | undefined = globalForPrisma.prisma;
const stale = Boolean(cached) && !(cached as object && "auditLog" in (cached as object));
if (stale) void cached?.$disconnect().catch(() => {});

export const prisma = cached && !stale ? cached : new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

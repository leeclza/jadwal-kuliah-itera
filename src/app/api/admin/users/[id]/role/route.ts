import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, withErrors } from "@/lib/api";
import { isOwner, ROLES } from "@/lib/auth/admin";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog, logSafe } from "@/lib/audit/audit.service";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ role: z.enum(ROLES) });

/** Hanya pemilik yang boleh mengubah role; role pemilik sendiri tidak bisa diubah. */
export const PATCH = withErrors(async (req: Request, { params }: Ctx) => {
  const me = await requireUserApi();
  const { id } = await params;
  if (!isOwner(me)) {
    await logSafe({
      actor: me,
      action: AuditAction.SECURITY_ACCESS_DENIED,
      description: `${actorName(me)} mencoba mengubah role user tanpa izin`,
      targetType: AuditTargetType.USER,
      targetId: id,
      request: req,
    });
    throw new HttpError(403, "Hanya dev yang boleh mengatur admin.");
  }
  const { role } = schema.parse(await req.json());
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, name: true, role: true } });
  if (!target) throw new HttpError(404, "Pengguna tidak ditemukan.");
  if (isOwner(target)) throw new HttpError(400, "Role dev tidak bisa diubah.");
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id }, data: { role }, select: { id: true, role: true } });
    if (target.role !== role) {
      const targetName = target.name ?? target.email;
      await createAuditLog(
        {
          actor: me,
          action: AuditAction.ADMIN_UPDATE_USER,
          description: `${actorName(me)} mengubah role ${targetName} menjadi ${role === "ADMIN" ? "Admin" : "Mahasiswa"}`,
          targetType: AuditTargetType.USER,
          targetId: target.id,
          targetName,
          beforeData: { role: target.role },
          afterData: { role },
          metadata: { targetEmail: target.email },
          request: req,
        },
        tx,
      );
    }
    return u;
  });
  return NextResponse.json({ user: updated });
});

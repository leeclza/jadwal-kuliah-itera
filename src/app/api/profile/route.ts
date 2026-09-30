import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { resolveNim } from "@/lib/auth/identity-server";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog } from "@/lib/audit/audit.service";
import { changedFields } from "@/lib/audit/format";
import { profileSchema } from "@/lib/validation";

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const data = profileSchema.parse(await req.json());
  data.nim = resolveNim(user.email, data.nim);
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({ where: { id: user.id }, data });
    const pick = (x: { name: string | null; nim: string | null; prodi: string | null }) => ({ name: x.name, nim: x.nim, prodi: x.prodi });
    const diff = changedFields(pick(user), pick(u));
    if (diff.changed) {
      await createAuditLog(
        {
          actor: user, // snapshot nama SEBELUM perubahan
          action: AuditAction.PROFILE_UPDATE,
          description: `${actorName(user)} mengubah data profil miliknya sendiri`,
          targetType: AuditTargetType.USER,
          targetId: user.id,
          targetName: u.name ?? u.email,
          beforeData: diff.before,
          afterData: diff.after,
          metadata: { nim: u.nim, self: true },
          request: req,
        },
        tx,
      );
    }
    return u;
  });
  return NextResponse.json({ user: { name: updated.name, nim: updated.nim, prodi: updated.prodi } });
});

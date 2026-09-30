import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog } from "@/lib/audit/audit.service";
import { changedFields } from "@/lib/audit/format";
import { semesterName } from "@/lib/schedule/semester";
import { spsUrlSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  spsUrl: spsUrlSchema,
  setActive: z.boolean().optional(),
});

export const PATCH = withErrors(async (req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const sem = await prisma.semester.findFirst({ where: { id, userId: user.id } });
  if (!sem) throw new HttpError(404, "Semester tidak ditemukan.");
  const { setActive, ...data } = patchSchema.parse(await req.json());
  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.semester.update({
      where: { id: sem.id },
      data: { spsUrl: data.spsUrl },
    });
    if (setActive) {
      await tx.user.update({ where: { id: user.id }, data: { activeSemesterId: sem.id } });
    }
    const pick = (x: typeof sem) => ({ spsUrl: x.spsUrl });
    const diff = changedFields(pick(sem), pick(u));
    if (diff.changed || setActive) {
      await createAuditLog(
        {
          actor: user,
          action: AuditAction.SEMESTER_UPDATE,
          description: `${actorName(user)} mengubah ${semesterName(sem)}${setActive ? " dan menjadikannya aktif" : ""}`,
          targetType: AuditTargetType.SEMESTER,
          targetId: sem.id,
          targetName: semesterName(u),
          beforeData: diff.before,
          afterData: diff.after,
          metadata: { setActive: Boolean(setActive) },
          request: req,
        },
        tx,
      );
    }
    return u;
  });
  return NextResponse.json({ semester: updated });
});

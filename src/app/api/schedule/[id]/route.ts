import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog } from "@/lib/audit/audit.service";
import { changedFields, scheduleSnapshot } from "@/lib/audit/format";
import { auditConflicts } from "@/lib/audit/schedule";
import { assertSksLimit, findOwnedItem, toDTO } from "@/lib/schedule/repo";
import { scheduleInputSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrors(async (req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const existing = await findOwnedItem(user.id, id);
  const data = scheduleInputSchema.parse(await req.json());
  const type = existing.source === "SIAKAD" ? existing.type : data.type;
  const sks = existing.source === "SIAKAD" ? (data.sks ?? existing.sks) : data.sks;
  await assertSksLimit(user.id, existing.semesterId, { ...data, type, sks }, existing.id);
  // Item SIAKAD boleh diedit tapi source tetap SIAKAD. Sync berikutnya menimpa
  // field hasil SIAKAD/SPS -> untuk versi custom pakai "Salin jadi manual".
  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.scheduleItem.update({
      where: { id: existing.id },
      data: {
        ...data,
        type,
        sks,
        courseName: data.title,
        matchStatus: data.day && data.startTime && data.endTime ? "MATCHED" : existing.matchStatus,
      },
    });
    const diff = changedFields(scheduleSnapshot(existing), scheduleSnapshot(updated));
    if (diff.changed) {
      await createAuditLog(
        {
          actor: user,
          action: existing.isManual ? AuditAction.SCHEDULE_MANUAL_UPDATE : AuditAction.SCHEDULE_UPDATE,
          description: `${actorName(user)} mengubah jadwal ${existing.title}`,
          targetType: AuditTargetType.SCHEDULE,
          targetId: existing.id,
          targetName: updated.title,
          beforeData: diff.before,
          afterData: diff.after,
          metadata: { source: existing.source, fields: Object.keys(diff.after) },
          request: req,
        },
        tx,
      );
    }
    return updated;
  });
  await auditConflicts(user, item, req);
  return NextResponse.json({ item: toDTO(item) });
});

export const DELETE = withErrors(async (req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const existing = await findOwnedItem(user.id, id);
  await prisma.$transaction(async (tx) => {
    await tx.scheduleItem.delete({ where: { id: existing.id } });
    await createAuditLog(
      {
        actor: user,
        action: existing.isManual ? AuditAction.SCHEDULE_MANUAL_DELETE : AuditAction.SCHEDULE_DELETE,
        description: `${actorName(user)} menghapus jadwal: ${existing.title}`,
        targetType: AuditTargetType.SCHEDULE,
        targetId: existing.id,
        targetName: existing.title,
        beforeData: scheduleSnapshot(existing),
        afterData: null,
        metadata: { source: existing.source },
        request: req,
      },
      tx,
    );
  });
  return NextResponse.json({ ok: true });
});

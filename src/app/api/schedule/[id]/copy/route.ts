import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog } from "@/lib/audit/audit.service";
import { scheduleSnapshot } from "@/lib/audit/format";
import { findOwnedItem, toDTO } from "@/lib/schedule/repo";

type Ctx = { params: Promise<{ id: string }> };

/** Salin jadwal (mis. dari SIAKAD) menjadi jadwal MANUAL yang tidak disentuh sync. */
export const POST = withErrors(async (req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const s = await findOwnedItem(user.id, id);
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.scheduleItem.create({
      data: {
        userId: user.id,
        semesterId: s.semesterId,
        source: "MANUAL",
        isManual: true,
        type: s.type,
        title: s.title,
        courseCode: s.courseCode,
        courseName: s.courseName,
        className: s.className,
        room: s.room,
        lecturers: s.lecturers,
        sks: s.sks,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        notes: s.notes,
        matchStatus: "MATCHED",
      },
    });
    await createAuditLog(
      {
        actor: user,
        action: AuditAction.SCHEDULE_COPY,
        description: `${actorName(user)} menyalin jadwal ${s.title} menjadi jadwal manual`,
        targetType: AuditTargetType.SCHEDULE,
        targetId: created.id,
        targetName: created.title,
        afterData: scheduleSnapshot(created),
        metadata: { copiedFrom: s.id, fromSource: s.source },
        request: req,
      },
      tx,
    );
    return created;
  });
  return NextResponse.json({ item: toDTO(item) }, { status: 201 });
});

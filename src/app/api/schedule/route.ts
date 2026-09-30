import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog } from "@/lib/audit/audit.service";
import { dayName, scheduleSnapshot } from "@/lib/audit/format";
import { auditConflicts } from "@/lib/audit/schedule";
import { assertSksLimit, getActiveSemester, toDTO } from "@/lib/schedule/repo";
import { semesterName } from "@/lib/schedule/semester";
import { sortSchedule } from "@/lib/schedule/grouping";
import { scheduleInputSchema } from "@/lib/validation";

export const GET = withErrors(async () => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const items = await prisma.scheduleItem.findMany({
    where: { userId: user.id, semesterId: semester.id },
  });
  return NextResponse.json({ items: sortSchedule(items.map(toDTO)) });
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const data = scheduleInputSchema.parse(await req.json());
  await assertSksLimit(user.id, semester.id, data);
  const item = await prisma.$transaction(async (tx) => {
    const created = await tx.scheduleItem.create({
      data: {
        ...data,
        courseName: data.title,
        userId: user.id,
        semesterId: semester.id,
        source: "MANUAL",
        isManual: true,
        matchStatus: "MATCHED",
      },
    });
    await createAuditLog(
      {
        actor: user,
        action: AuditAction.SCHEDULE_MANUAL_CREATE,
        description: `${actorName(user)} menambahkan jadwal manual: ${created.title}`,
        targetType: AuditTargetType.SCHEDULE,
        targetId: created.id,
        targetName: created.title,
        afterData: scheduleSnapshot(created),
        metadata: {
          type: created.type,
          day: dayName(created.day),
          startTime: created.startTime,
          endTime: created.endTime,
          room: created.room,
          semester: semester.number,
        },
        request: req,
      },
      tx,
    );
    return created;
  });
  await auditConflicts(user, item, req);
  return NextResponse.json({ item: toDTO(item) }, { status: 201 });
});

/** Hapus SEMUA jadwal di semester aktif (SIAKAD + manual). Semester lain/arsip tidak disentuh. */
export const DELETE = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const count = await prisma.$transaction(async (tx) => {
    const { count } = await tx.scheduleItem.deleteMany({ where: { userId: user.id, semesterId: semester.id } });
    await createAuditLog(
      {
        actor: user,
        action: AuditAction.SCHEDULE_DELETE_ALL,
        description: `${actorName(user)} menghapus semua jadwal (${count}) di ${semesterName(semester)}`,
        targetType: AuditTargetType.SEMESTER,
        targetId: semester.id,
        targetName: semesterName(semester),
        metadata: { deleted: count, semester: semester.number },
        request: req,
      },
      tx,
    );
    return count;
  });
  return NextResponse.json({ deleted: count });
});

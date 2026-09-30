import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { HttpError, withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { findOwnedItem, type CandidateDTO } from "@/lib/schedule/repo";
import { sourceIdFor } from "@/lib/schedule/sync";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog } from "@/lib/audit/audit.service";

type Ctx = { params: Promise<{ id: string }> };
const bodySchema = z.object({ className: z.string().trim().min(1).max(20) });

/**
 * User memilih kelas yang benar untuk item "Perlu Konfirmasi".
 * Semua sesi kelas tersebut dari kandidat SPS dipasang ke jadwal.
 */
export const POST = withErrors(async (req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const item = await findOwnedItem(user.id, id);
  const { className } = bodySchema.parse(await req.json());
  const cls = className.toUpperCase();
  const candidates = (item.candidates ?? []) as unknown as CandidateDTO[];
  const chosen = candidates.filter((c) => c.className.toUpperCase() === cls);
  if (item.source !== "SIAKAD" || chosen.length === 0) {
    throw new HttpError(400, "Kelas tidak ada di daftar kandidat.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.scheduleItem.delete({ where: { id: item.id } });
    for (const [i, c] of chosen.entries()) {
      const sourceId = sourceIdFor(item.courseCode ?? "", cls, i);
      const data = {
        type: item.type,
        title: item.title,
        courseCode: item.courseCode,
        courseName: item.courseName,
        className: cls,
        room: c.room ?? null,
        lecturers: item.lecturers,
        sks: item.sks,
        day: c.day,
        startTime: c.startTime,
        endTime: c.endTime,
        matchStatus: "MATCHED" as const,
        candidates: Prisma.DbNull,
      };
      await tx.scheduleItem.upsert({
        where: {
          userId_semesterId_source_sourceId: {
            userId: user.id,
            semesterId: item.semesterId,
            source: "SIAKAD",
            sourceId,
          },
        },
        update: data,
        create: { ...data, userId: user.id, semesterId: item.semesterId, source: "SIAKAD", sourceId },
      });
    }
    await createAuditLog(
      {
        actor: user,
        action: AuditAction.SCHEDULE_RESOLVE,
        description: `${actorName(user)} memilih kelas ${cls} untuk ${item.title}`,
        targetType: AuditTargetType.SCHEDULE,
        targetId: item.id,
        targetName: item.title,
        beforeData: { className: item.className, matchStatus: item.matchStatus },
        afterData: { className: cls, matchStatus: "MATCHED" },
        metadata: { sessions: chosen.length },
        request: req,
      },
      tx,
    );
  });
  return NextResponse.json({ ok: true });
});

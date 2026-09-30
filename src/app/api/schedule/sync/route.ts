import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, logSafe } from "@/lib/audit/audit.service";
import { getActiveSemester } from "@/lib/schedule/repo";
import { semesterName } from "@/lib/schedule/semester";
import { syncSiakadSchedules } from "@/lib/schedule/sync-service";
import { syncSchema } from "@/lib/validation";

export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const body = syncSchema.parse(await req.json());
  const base = {
    actor: user,
    action: AuditAction.SCHEDULE_SYNC,
    targetType: AuditTargetType.SEMESTER,
    targetId: semester.id,
    targetName: semesterName(semester),
    request: req,
  };
  try {
    const summary = await syncSiakadSchedules(user.id, semester.id, body, { nim: user.nim, name: user.name });
    // Teks SIAKAD mentah sengaja tidak disimpan (bisa berisi data pribadi).
    await logSafe({
      ...base,
      description: `${actorName(user)} memperbarui jadwal dari SIAKAD`,
      metadata: {
        status: "SUCCESS",
        mode: body.mode,
        semester: semester.number,
        added: summary.added,
        updated: summary.updated,
        removed: summary.removed,
        manualPreserved: summary.manualKept,
        needsConfirmation: summary.needsConfirmation,
      },
    });
    return NextResponse.json({ summary });
  } catch (err) {
    await logSafe({
      ...base,
      description: `${actorName(user)} gagal memperbarui jadwal dari SIAKAD`,
      metadata: {
        status: "FAILED",
        mode: body.mode,
        semester: semester.number,
        errorCode: err instanceof Error ? err.name : "UnknownError",
        reason: err instanceof Error ? err.message.slice(0, 300) : "Tidak diketahui",
      },
    });
    throw err;
  }
});

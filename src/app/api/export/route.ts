import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, logSafe } from "@/lib/audit/audit.service";
import { buildScheduleWorkbook, exportFileName } from "@/lib/export/xlsx";
import { getActiveSemester, toDTO } from "@/lib/schedule/repo";
import { semesterName } from "@/lib/schedule/semester";

export const GET = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const items = await prisma.scheduleItem.findMany({
    where: { userId: user.id, semesterId: semester.id, day: { not: null } },
  });
  const semesterLabel = semesterName(semester);
  const buf = await buildScheduleWorkbook(items.map(toDTO), { semesterLabel });
  await logSafe({
    actor: user,
    action: AuditAction.SCHEDULE_EXPORT_XLSX,
    description: `${actorName(user)} mengunduh jadwal kuliah dalam format XLSX`,
    targetType: AuditTargetType.SEMESTER,
    targetId: semester.id,
    targetName: semesterLabel,
    metadata: { format: "xlsx", semester: semester.number, totalSchedules: items.length },
    request: req,
  });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(user.nim)}"`,
      "Cache-Control": "no-store",
    },
  });
});

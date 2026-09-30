import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { buildScheduleWorkbook, exportFileName } from "@/lib/export/xlsx";
import { getActiveSemester, toDTO } from "@/lib/schedule/repo";

export const GET = withErrors(async () => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const items = await prisma.scheduleItem.findMany({
    where: { userId: user.id, semesterId: semester.id, day: { not: null } },
  });
  const buf = await buildScheduleWorkbook(items.map(toDTO), {
    semesterLabel: semester.label || `Semester ${semester.number}`,
  });
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${exportFileName(user.nim)}"`,
      "Cache-Control": "no-store",
    },
  });
});

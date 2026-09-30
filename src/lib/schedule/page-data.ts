import type { User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { defaultSpsUrl } from "@/lib/google-sheets/service";
import { sortSchedule } from "./grouping";
import { toDTO } from "./repo";
import { semesterName } from "./semester";

/** Data jadwal semester aktif untuk halaman (server component). */
export async function loadActiveSchedule(user: User) {
  const semester = user.activeSemesterId
    ? await prisma.semester.findFirst({ where: { id: user.activeSemesterId, userId: user.id } })
    : null;
  const items = semester
    ? await prisma.scheduleItem.findMany({ where: { userId: user.id, semesterId: semester.id } })
    : [];
  return {
    semester,
    semesterLabel: semester ? semesterName(semester) : "-",
    spsUrlSet: Boolean(semester?.spsUrl || defaultSpsUrl() || process.env.SCHEDULE_TIME_PROVIDER === "mock"),
    items: sortSchedule(items.map(toDTO)),
  };
}

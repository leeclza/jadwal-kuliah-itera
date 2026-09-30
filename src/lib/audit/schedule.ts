import type { ScheduleItem, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isOverlap } from "@/lib/schedule/conflict";
import { AuditAction, AuditTargetType } from "./actions";
import { actorName, logSafe } from "./audit.service";
import { dayName } from "./format";

/** Catat SCHEDULE_CONFLICT_DETECTED jika item baru/berubah bentrok dengan jadwal lain. Best-effort. */
export async function auditConflicts(user: User, item: ScheduleItem, request?: Request) {
  if (!item.day || !item.startTime || !item.endTime) return;
  try {
    const others = await prisma.scheduleItem.findMany({
      where: { userId: user.id, semesterId: item.semesterId, day: item.day, id: { not: item.id } },
      select: { id: true, title: true, type: true, source: true, day: true, startTime: true, endTime: true },
    });
    const hits = others.filter((o) => isOverlap(item, o));
    if (!hits.length) return;
    const day = dayName(item.day);
    await logSafe({
      actor: user,
      action: AuditAction.SCHEDULE_CONFLICT_DETECTED,
      description: `${actorName(user)} memiliki konflik jadwal pada hari ${day}`,
      targetType: AuditTargetType.SCHEDULE,
      targetId: item.id,
      targetName: item.title,
      metadata: {
        day,
        scheduleA: `${item.title} (${item.startTime}-${item.endTime})`,
        scheduleB: hits.map((h) => `${h.title} (${h.startTime}-${h.endTime})`).join("; "),
        count: hits.length,
      },
      request,
    });
  } catch {
    // deteksi konflik tidak boleh menggagalkan request
  }
}

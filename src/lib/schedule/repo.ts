import type { ScheduleItem, User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { HttpError } from "@/lib/api";

export async function getActiveSemester(user: User) {
  if (!user.activeSemesterId) throw new HttpError(400, "Pilih semester aktif terlebih dahulu.");
  const semester = await prisma.semester.findFirst({
    where: { id: user.activeSemesterId, userId: user.id },
  });
  if (!semester) throw new HttpError(400, "Semester aktif tidak ditemukan.");
  return semester;
}

/** Selalu dibatasi userId -> user A tidak bisa menyentuh data user B. */
export async function findOwnedItem(userId: string, id: string) {
  const item = await prisma.scheduleItem.findFirst({ where: { id, userId } });
  if (!item) throw new HttpError(404, "Jadwal tidak ditemukan.");
  return item;
}

export interface CandidateDTO {
  day: number;
  startTime: string;
  endTime: string;
  className: string;
  room?: string;
  courseName: string;
}

export function toDTO(i: ScheduleItem) {
  return {
    id: i.id,
    type: i.type,
    source: i.source,
    title: i.title,
    courseCode: i.courseCode,
    courseName: i.courseName,
    className: i.className,
    room: i.room,
    lecturers: i.lecturers,
    sks: i.sks,
    day: i.day,
    startTime: i.startTime,
    endTime: i.endTime,
    notes: i.notes,
    isManual: i.isManual,
    matchStatus: i.matchStatus,
    candidates: (i.candidates ?? null) as CandidateDTO[] | null,
  };
}

export type ScheduleDTO = ReturnType<typeof toDTO>;

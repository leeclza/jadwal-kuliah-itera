import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getScheduleTimeProvider } from "@/lib/google-sheets/service";
import { getSiakadProvider } from "@/lib/siakad/service";
import { HttpError } from "@/lib/api";
import { checkSiakadOwner } from "@/lib/auth/identity";
import { planSiakadSync, type SyncItemData } from "./sync";
import type { SiakadCourse } from "./types";

export type SyncRequest =
  | { mode: "siakad"; text?: string }
  | { mode: "pick"; courses: SiakadCourse[] }
  | { mode: "refresh" };

export interface SyncSummary {
  added: number;
  updated: number;
  removed: number;
  manualKept: number;
  needsConfirmation: number;
}

const toDb = (d: SyncItemData) => ({
  ...d,
  candidates: d.candidates ? (d.candidates as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
});

const OWNER_ERRORS = {
  NO_NIM: "Lengkapi NIM di Profile dulu.",
  NIM_NOT_FOUND:
    "NIM kamu tidak ditemukan di teks SIAKAD. Copy seluruh halaman KRS/Jadwal (Ctrl+A) supaya bagian NIM ikut tercopy.",
  OTHER_NIM:
    "Data SIAKAD yang ditempel milik NIM lain. Login SIAKAD harus memakai akun yang sama dengan akun Google di web ini.",
} as const;

export async function syncSiakadSchedules(
  userId: string,
  semesterId: string,
  req: SyncRequest,
  owner: { nim: string | null } = { nim: null },
): Promise<SyncSummary> {
  const semester = await prisma.semester.findFirst({ where: { id: semesterId, userId } });
  if (!semester) throw new HttpError(404, "Semester tidak ditemukan.");

  const existing = await prisma.scheduleItem.findMany({
    where: { userId, semesterId, source: "SIAKAD" },
    select: { id: true, sourceId: true, courseCode: true, courseName: true, className: true, lecturers: true, sks: true, matchStatus: true },
  });

  // 1. Kumpulkan daftar mata kuliah (semua fetch eksternal terjadi SEBELUM transaksi)
  let courses: SiakadCourse[];
  if (req.mode === "siakad") {
    const provider = getSiakadProvider();
    // Teks SIAKAD wajib milik NIM user (akun SIAKAD = akun Google yang login).
    // Teks kosong: provider real menolak sendiri, provider mock memakai data contoh.
    if (req.text?.trim()) {
      const check = checkSiakadOwner(req.text ?? "", owner.nim ?? "");
      if (!check.ok) throw new HttpError(403, OWNER_ERRORS[check.reason]);
    }
    courses = await provider.getCourses({ text: req.text });
  } else if (req.mode === "pick") {
    courses = req.courses;
  } else {
    const seen = new Set<string>();
    courses = [];
    for (const e of existing) {
      const key = `${e.courseCode}|${e.className ?? ""}`;
      if (!e.courseCode || seen.has(key)) continue;
      seen.add(key);
      courses.push({
        courseCode: e.courseCode,
        courseName: e.courseName ?? e.courseCode,
        className: e.className ?? undefined,
        lecturers: e.lecturers,
        sks: e.sks ?? undefined,
      });
    }
  }

  // 2. Hari + jam dari SPS
  const rows = await getScheduleTimeProvider().getRows(semester.spsUrl);

  // 3. Rencana sync (hanya SIAKAD)
  const plan = planSiakadSync(courses, rows, existing);

  // 4. Terapkan atomik. Filter source=SIAKAD di setiap query sebagai pengaman ganda.
  await prisma.$transaction(async (tx) => {
    if (plan.delete.length) {
      await tx.scheduleItem.deleteMany({
        where: { id: { in: plan.delete }, userId, semesterId, source: "SIAKAD" },
      });
    }
    for (const u of plan.update) {
      await tx.scheduleItem.updateMany({
        where: { id: u.id, userId, semesterId, source: "SIAKAD" },
        data: toDb(u.data),
      });
    }
    if (plan.create.length) {
      await tx.scheduleItem.createMany({
        data: plan.create.map((d) => ({
          ...toDb(d),
          userId,
          semesterId,
          source: "SIAKAD" as const,
          type: "COURSE" as const,
          isManual: false,
        })),
      });
    }
    await tx.semester.update({ where: { id: semesterId }, data: { lastSyncAt: new Date() } });
  });

  const manualKept = await prisma.scheduleItem.count({
    where: { userId, semesterId, source: "MANUAL" },
  });

  return {
    added: plan.stats.added,
    updated: plan.stats.updated,
    removed: plan.stats.removed,
    manualKept,
    needsConfirmation: plan.stats.needsConfirmation,
  };
}

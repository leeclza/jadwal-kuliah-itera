import type { User } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { angkatanFromNim } from "@/lib/auth/identity";
import { currentSemesterNumber } from "./semester";

/**
 * Jika semester berjalan (dari angkatan NIM) lebih baru dari semester yang ada,
 * buat semester baru dan jadikan aktif. Jadwal semester lama tetap tersimpan.
 * Hanya maju: tidak pernah mengganti semester aktif ke yang lebih lama.
 */
export async function ensureCurrentSemester(user: User): Promise<User> {
  const angkatan = angkatanFromNim(user.nim);
  if (!angkatan) return user;
  const target = currentSemesterNumber(angkatan);

  const latest = await prisma.semester.findFirst({
    where: { userId: user.id, isShort: false },
    orderBy: { number: "desc" },
    select: { number: true, spsUrl: true },
  });
  if (latest && latest.number >= target) return user;

  let semesterId: string;
  try {
    const sem = await prisma.semester.upsert({
      where: { userId_number_isShort: { userId: user.id, number: target, isShort: false } },
      update: {},
      create: { userId: user.id, number: target },
    });
    semesterId = sem.id;
  } catch {
    // Request paralel sudah membuatnya lebih dulu.
    const sem = await prisma.semester.findUnique({
      where: { userId_number_isShort: { userId: user.id, number: target, isShort: false } },
    });
    if (!sem) return user;
    semesterId = sem.id;
  }
  return prisma.user.update({ where: { id: user.id }, data: { activeSemesterId: semesterId } });
}

/** Semester berjalan menurut sistem (angkatan NIM + kalender akademik). Tidak bisa diubah user. */
export function systemSemesterNumber(nim: string | null | undefined): number {
  const angkatan = angkatanFromNim(nim ?? null);
  return angkatan ? currentSemesterNumber(angkatan) : 1;
}

import { NextResponse } from "next/server";
import { HttpError, withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { semesterSchema } from "@/lib/validation";

/** Tambah semester baru (dan jadikan aktif). Jadwal semester lama tidak disentuh. */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const data = semesterSchema.parse(await req.json());
  const exists = await prisma.semester.findUnique({
    where: { userId_number: { userId: user.id, number: data.number } },
  });
  if (exists) throw new HttpError(409, `Semester ${data.number} sudah ada.`);
  const sem = await prisma.semester.create({ data: { ...data, userId: user.id } });
  await prisma.user.update({ where: { id: user.id }, data: { activeSemesterId: sem.id } });
  return NextResponse.json({ semester: sem }, { status: 201 });
});

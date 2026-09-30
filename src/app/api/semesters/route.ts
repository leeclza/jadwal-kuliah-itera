import { NextResponse } from "next/server";
import { HttpError, withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { actorName, createAuditLog } from "@/lib/audit/audit.service";
import { semesterName, shortSemesterBase } from "@/lib/schedule/semester";
import { systemSemesterNumber } from "@/lib/schedule/semester-server";
import { shortSemesterSchema } from "@/lib/validation";

/**
 * Tambah semester pendek (opsional) setelah semester genap terbaru, lalu jadikan aktif.
 * Semester reguler tidak bisa ditambah manual: dibuat otomatis dari angkatan NIM.
 */
export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const data = shortSemesterSchema.parse(await req.json());
  const regular = await prisma.semester.findMany({
    where: { userId: user.id, isShort: false },
    select: { number: true },
  });
  const base = shortSemesterBase(regular.map((s) => s.number), systemSemesterNumber(user.nim));
  if (base === null) throw new HttpError(400, "Semester pendek hanya bisa ditambahkan setelah semester genap.");
  const exists = await prisma.semester.findUnique({
    where: { userId_number_isShort: { userId: user.id, number: base, isShort: true } },
  });
  if (exists) throw new HttpError(409, `Semester pendek setelah Semester ${base} sudah ada.`);
  const sem = await prisma.$transaction(async (tx) => {
    const s = await tx.semester.create({ data: { userId: user.id, number: base, isShort: true, spsUrl: data.spsUrl } });
    await tx.user.update({ where: { id: user.id }, data: { activeSemesterId: s.id } });
    await createAuditLog(
      {
        actor: user,
        action: AuditAction.SEMESTER_CREATE,
        description: `${actorName(user)} menambahkan ${semesterName(s)}`,
        targetType: AuditTargetType.SEMESTER,
        targetId: s.id,
        targetName: semesterName(s),
        afterData: { number: s.number, isShort: true, spsUrl: s.spsUrl },
        request: req,
      },
      tx,
    );
    return s;
  });
  return NextResponse.json({ semester: sem }, { status: 201 });
});

/** Hapus semester pendek (mis. batal ambil SP). Semester reguler tidak bisa dihapus. */
export const DELETE = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const id = new URL(req.url).searchParams.get("id");
  const sem = id ? await prisma.semester.findFirst({ where: { id, userId: user.id } }) : null;
  if (!sem) throw new HttpError(404, "Semester tidak ditemukan.");
  if (!sem.isShort) throw new HttpError(403, "Semester reguler ditentukan sistem dan tidak bisa dihapus.");
  await prisma.$transaction(async (tx) => {
    if (user.activeSemesterId === sem.id) {
      const fallback = await tx.semester.findFirst({
        where: { userId: user.id, isShort: false },
        orderBy: { number: "desc" },
      });
      await tx.user.update({ where: { id: user.id }, data: { activeSemesterId: fallback?.id ?? null } });
    }
    await tx.semester.delete({ where: { id: sem.id } });
    await createAuditLog(
      {
        actor: user,
        action: AuditAction.SEMESTER_DELETE,
        description: `${actorName(user)} menghapus ${semesterName(sem)}`,
        targetType: AuditTargetType.SEMESTER,
        targetId: sem.id,
        targetName: semesterName(sem),
        beforeData: { number: sem.number, isShort: true, spsUrl: sem.spsUrl },
        request: req,
      },
      tx,
    );
  });
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { resolveNim } from "@/lib/auth/identity-server";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { AuditAction, AuditTargetType } from "@/lib/audit/actions";
import { createAuditLog } from "@/lib/audit/audit.service";
import { systemSemesterNumber } from "@/lib/schedule/semester-server";
import { onboardingSchema } from "@/lib/validation";

export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const { spsUrl, ...profile } = onboardingSchema.parse(await req.json());
  profile.nim = resolveNim(user.email, profile.nim);
  // Semester ditentukan sistem dari angkatan NIM, bukan input user.
  const semester = systemSemesterNumber(profile.nim);
  await prisma.$transaction(async (tx) => {
    const sem = await tx.semester.upsert({
      where: { userId_number_isShort: { userId: user.id, number: semester, isShort: false } },
      update: { spsUrl },
      create: { userId: user.id, number: semester, spsUrl },
    });
    await tx.user.update({ where: { id: user.id }, data: { ...profile, activeSemesterId: sem.id } });
    const name = profile.name || user.name || user.email;
    await createAuditLog(
      {
        actor: { ...user, name },
        action: AuditAction.PROFILE_CREATE,
        description: `${name} melengkapi data profil`,
        targetType: AuditTargetType.USER,
        targetId: user.id,
        targetName: name,
        afterData: { name: profile.name, nim: profile.nim, prodi: profile.prodi, semester },
        metadata: { nim: profile.nim, semester },
        request: req,
      },
      tx,
    );
  });
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { assertNimMatchesEmail } from "@/lib/auth/identity-server";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { onboardingSchema } from "@/lib/validation";

export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const { semester, spsUrl, ...profile } = onboardingSchema.parse(await req.json());
  assertNimMatchesEmail(user.email, profile.nim);
  await prisma.$transaction(async (tx) => {
    const sem = await tx.semester.upsert({
      where: { userId_number: { userId: user.id, number: semester } },
      update: { spsUrl },
      create: { userId: user.id, number: semester, spsUrl },
    });
    await tx.user.update({ where: { id: user.id }, data: { ...profile, activeSemesterId: sem.id } });
  });
  return NextResponse.json({ ok: true });
});

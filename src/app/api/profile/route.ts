import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { assertNimMatchesEmail } from "@/lib/auth/identity-server";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { profileSchema } from "@/lib/validation";

export const PATCH = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const data = profileSchema.parse(await req.json());
  assertNimMatchesEmail(user.email, data.nim);
  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ user: { name: updated.name, nim: updated.nim, prodi: updated.prodi } });
});

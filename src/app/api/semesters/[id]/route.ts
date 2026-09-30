import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { spsUrlSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  spsUrl: spsUrlSchema,
  label: z.string().trim().max(60).optional().nullable(),
  setActive: z.boolean().optional(),
});

export const PATCH = withErrors(async (req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const sem = await prisma.semester.findFirst({ where: { id, userId: user.id } });
  if (!sem) throw new HttpError(404, "Semester tidak ditemukan.");
  const { setActive, ...data } = patchSchema.parse(await req.json());
  const updated = await prisma.semester.update({
    where: { id: sem.id },
    data: { spsUrl: data.spsUrl, label: data.label ?? sem.label },
  });
  if (setActive) {
    await prisma.user.update({ where: { id: user.id }, data: { activeSemesterId: sem.id } });
  }
  return NextResponse.json({ semester: updated });
});

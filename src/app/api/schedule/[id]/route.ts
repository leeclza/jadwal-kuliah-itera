import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { findOwnedItem, toDTO } from "@/lib/schedule/repo";
import { scheduleInputSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withErrors(async (req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const existing = await findOwnedItem(user.id, id);
  const data = scheduleInputSchema.parse(await req.json());
  // Item SIAKAD boleh diedit tapi source tetap SIAKAD. Sync berikutnya menimpa
  // field hasil SIAKAD/SPS -> untuk versi custom pakai "Salin jadi manual".
  const item = await prisma.scheduleItem.update({
    where: { id: existing.id },
    data: {
      ...data,
      type: existing.source === "SIAKAD" ? existing.type : data.type,
      courseName: data.title,
      matchStatus: data.day && data.startTime && data.endTime ? "MATCHED" : existing.matchStatus,
    },
  });
  return NextResponse.json({ item: toDTO(item) });
});

export const DELETE = withErrors(async (_req: Request, { params }: Ctx) => {
  const user = await requireUserApi();
  const { id } = await params;
  const existing = await findOwnedItem(user.id, id);
  await prisma.scheduleItem.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
});

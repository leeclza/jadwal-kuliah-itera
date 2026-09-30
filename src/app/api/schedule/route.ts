import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { getActiveSemester, toDTO } from "@/lib/schedule/repo";
import { sortSchedule } from "@/lib/schedule/grouping";
import { scheduleInputSchema } from "@/lib/validation";

export const GET = withErrors(async () => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const items = await prisma.scheduleItem.findMany({
    where: { userId: user.id, semesterId: semester.id },
  });
  return NextResponse.json({ items: sortSchedule(items.map(toDTO)) });
});

export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const data = scheduleInputSchema.parse(await req.json());
  const item = await prisma.scheduleItem.create({
    data: {
      ...data,
      courseName: data.title,
      userId: user.id,
      semesterId: semester.id,
      source: "MANUAL",
      isManual: true,
      matchStatus: "MATCHED",
    },
  });
  return NextResponse.json({ item: toDTO(item) }, { status: 201 });
});

import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { getActiveSemester } from "@/lib/schedule/repo";
import { syncSiakadSchedules } from "@/lib/schedule/sync-service";
import { syncSchema } from "@/lib/validation";

export const POST = withErrors(async (req: Request) => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const body = syncSchema.parse(await req.json());
  const summary = await syncSiakadSchedules(user.id, semester.id, body, { nim: user.nim });
  return NextResponse.json({ summary });
});

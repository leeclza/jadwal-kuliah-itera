import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { getScheduleTimeProvider } from "@/lib/google-sheets/service";
import { getActiveSemester } from "@/lib/schedule/repo";

/** Semua baris jadwal dari SPS semester aktif (untuk fitur "Pilih dari SPS"). */
export const GET = withErrors(async () => {
  const user = await requireUserApi();
  const semester = await getActiveSemester(user);
  const rows = await getScheduleTimeProvider().getRows(semester.spsUrl);
  return NextResponse.json({ rows });
});

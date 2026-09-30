import { NextResponse } from "next/server";
import { HttpError, withErrors } from "@/lib/api";
import { getAdminStats } from "@/lib/admin/stats";
import { isAdmin } from "@/lib/auth/admin";
import { requireUserApi } from "@/lib/auth/session";

export const GET = withErrors(async () => {
  const me = await requireUserApi();
  if (!isAdmin(me)) throw new HttpError(403, "Khusus admin.");
  return NextResponse.json(await getAdminStats(), { headers: { "Cache-Control": "no-store" } });
});

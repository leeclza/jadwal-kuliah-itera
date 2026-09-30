import { NextResponse } from "next/server";
import { withErrors } from "@/lib/api";
import { requireUserApi } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";

/** Heartbeat dari tab yang terbuka. Body {offline:true} (via sendBeacon) = tab ditutup/disembunyikan. */
export const POST = withErrors(async (req: Request) => {
  const me = await requireUserApi();
  const body = await req.json().catch(() => ({}));
  const offline = body?.offline === true;
  await prisma.user.update({ where: { id: me.id }, data: { onlineAt: offline ? null : new Date() } });
  return new NextResponse(null, { status: 204 });
});

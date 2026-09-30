import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { ensureCurrentSemester } from "@/lib/schedule/semester-server";
import { isAdmin } from "./admin";
import { isAllowedEmail } from "./domain";

export class UnauthorizedError extends Error {}

/** User yang login (dari session server-side). Tidak pernah percaya input client. */
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !isAllowedEmail(user.email)) return null;
  const now = new Date();
  if (!user.lastSeenAt || now.getTime() - user.lastSeenAt.getTime() > SEEN_THROTTLE_MS) {
    // Best-effort: gagal update tidak boleh memblokir request.
    await prisma.user.update({ where: { id }, data: { lastSeenAt: now } }).catch(() => {});
    user.lastSeenAt = now;
  }
  return user;
}

const SEEN_THROTTLE_MS = 5 * 60 * 1000;

export async function requireAdminPage() {
  const user = await requireUserPage();
  if (!isAdmin(user)) notFound();
  return user;
}

export async function requireUserApi() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

const isComplete = (u: { nim: string | null; name: string | null; prodi: string | null; activeSemesterId: string | null }) =>
  Boolean(u.nim && u.name && u.prodi && u.activeSemesterId);

/**
 * Untuk halaman: redirect ke login / onboarding jika perlu, dan otomatis
 * naik ke semester baru. Di-cache per request (layout + page memanggilnya).
 */
const loadPageUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  return isComplete(user) ? ensureCurrentSemester(user) : user;
});

export async function requireUserPage(opts: { allowIncomplete?: boolean } = {}) {
  const user = await loadPageUser();
  if (!user) redirect("/login");
  if (!opts.allowIncomplete && !isComplete(user)) redirect("/onboarding");
  return user;
}

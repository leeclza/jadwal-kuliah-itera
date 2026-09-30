import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { isAllowedEmail } from "./domain";

export class UnauthorizedError extends Error {}

/** User yang login (dari session server-side). Tidak pernah percaya input client. */
export async function getCurrentUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !isAllowedEmail(user.email)) return null;
  return user;
}

export async function requireUserApi() {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Untuk halaman: redirect ke login / onboarding jika perlu. */
export async function requireUserPage(opts: { allowIncomplete?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!opts.allowIncomplete && (!user.nim || !user.name || !user.prodi || !user.activeSemesterId)) {
    redirect("/onboarding");
  }
  return user;
}

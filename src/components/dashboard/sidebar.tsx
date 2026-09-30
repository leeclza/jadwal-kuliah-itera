import type { ReactNode } from "react";
import { signOut } from "@/auth";
import { isAdmin, isOwner } from "@/lib/auth/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { recordLogout } from "@/lib/audit/auth";
import { SidebarShell } from "./sidebar-shell";

type SidebarUser = { name: string | null; email: string; image: string | null; role: string };

export function Sidebar({ user, children }: { user: SidebarUser; children: ReactNode }) {
  async function logout() {
    "use server";
    const me = await getCurrentUser();
    if (me) {
      await prisma.user.update({ where: { id: me.id }, data: { onlineAt: null } }).catch(() => {});
      await recordLogout(me);
    }
    await signOut({ redirectTo: "/login" });
  }
  const roleLabel = isOwner(user) ? "Dev" : isAdmin(user) ? "Admin" : "Mahasiswa";
  return (
    <SidebarShell name={user.name ?? user.email} image={user.image} roleLabel={roleLabel} admin={isAdmin(user)} logout={logout}>
      {children}
    </SidebarShell>
  );
}

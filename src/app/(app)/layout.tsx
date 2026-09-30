import { Presence } from "@/components/dashboard/presence";
import { Sidebar } from "@/components/dashboard/sidebar";
import { requireUserPage } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return (
    <>
      <Presence />
      <Sidebar user={user}>{children}</Sidebar>
    </>
  );
}

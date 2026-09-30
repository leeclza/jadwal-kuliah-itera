import { Navbar } from "@/components/dashboard/navbar";
import { requireUserPage } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage();
  return (
    <>
      <Navbar name={user.name ?? user.email} image={user.image} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  );
}

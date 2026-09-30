import Link from "next/link";
import { CalendarDays, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { NavLinks } from "./nav-links";

export function Navbar({ name, image }: { name: string; image?: string | null }) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <CalendarDays className="size-5 text-blue-700" aria-hidden />
          <span>SPS Jadwal</span>
        </Link>
        <NavLinks />
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden max-w-40 truncate text-sm text-slate-700 md:inline">{name}</span>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-8 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-800" aria-hidden>
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <form action={logout}>
            <button type="submit" aria-label="Keluar" className="grid size-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-slate-100 sm:hidden">
        <NavLinks mobile />
      </div>
    </header>
  );
}

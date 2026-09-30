"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Archive, CalendarDays, ChevronLeft, ChevronRight, Gauge, History, LayoutDashboard, LogOut, Menu, UserRound, X,
} from "lucide-react";
import { cn } from "@/lib/cn";

type Item = { href: string; label: string; icon: typeof Menu };

const MAIN: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profil", icon: UserRound },
  { href: "/jadwal", label: "Jadwal", icon: CalendarDays },
  { href: "/arsip", label: "Arsip", icon: Archive },
];

const ADMIN: Item[] = [
  { href: "/admin", label: "Overview & User", icon: Gauge },
  { href: "/admin/audit-log", label: "Audit Log", icon: History },
];

const STORAGE_KEY = "sidebar-collapsed";

const isActive = (path: string, href: string) =>
  href === "/" || href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`);

export function SidebarShell({ name, image, roleLabel, admin, logout, children }: {
  name: string;
  image?: string | null;
  roleLabel: string;
  admin?: boolean;
  logout: () => Promise<void>;
  children: ReactNode;
}) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => setMobileOpen(false), [path]);

  function toggle() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(STORAGE_KEY, c ? "0" : "1");
      } catch {}
      return !c;
    });
  }

  const avatar = image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="size-9 shrink-0 rounded-full border border-white/30" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-semibold" aria-hidden>
      {name.slice(0, 1).toUpperCase()}
    </span>
  );

  const nav = (compact: boolean) => (
    <nav aria-label="Menu utama" className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
      {[{ title: "Menu", items: MAIN }, ...(admin ? [{ title: "Admin", items: ADMIN }] : [])].map((g) => (
        <div key={g.title} className="space-y-1">
          <p className={cn("px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-200/70", compact && "sr-only")}>
            {g.title}
          </p>
          {g.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(path, href);
            return (
              <Link
                key={href}
                href={href}
                title={compact ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-white",
                  compact && "justify-center px-0",
                  active ? "bg-white/15 text-white shadow-inner" : "text-blue-100 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className={cn("truncate", compact && "sr-only")}>{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const panel = (compact: boolean) => (
    <div className="flex h-full flex-col bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 text-white">
      <Link href="/" className={cn("flex h-16 items-center gap-2 px-5 font-semibold", compact && "justify-center px-0")}>
        <CalendarDays className="size-6 shrink-0 text-blue-200" aria-hidden />
        <span className={cn("text-lg tracking-tight", compact && "sr-only")}>Jadwalin</span>
      </Link>
      <div className={cn("mx-3 mb-3 flex items-center gap-3 rounded-xl bg-white/10 p-3", compact && "justify-center bg-transparent p-1")}>
        {avatar}
        <div className={cn("min-w-0", compact && "sr-only")}>
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-xs text-blue-200">{roleLabel}</p>
        </div>
      </div>
      {nav(compact)}
      <form action={logout} className="p-3">
        <button
          type="submit"
          title={compact ? "Keluar" : undefined}
          className={cn(
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-500/90 text-sm font-semibold text-white hover:bg-red-500",
            "focus-visible:outline-2 focus-visible:outline-white",
          )}
        >
          <LogOut className="size-4" aria-hidden />
          <span className={cn(compact && "sr-only")}>Keluar</span>
        </button>
      </form>
    </div>
  );

  return (
    <div className="min-h-dvh lg:flex">
      {/* Mobile / tablet: top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
          aria-expanded={mobileOpen}
          className="grid size-10 place-items-center rounded-lg text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <Menu className="size-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <CalendarDays className="size-5 text-blue-700" aria-hidden />
          Jadwalin
        </Link>
      </header>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-slate-900/50" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] shadow-xl">
            {panel(false)}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
              className="absolute right-2 top-3 grid size-10 place-items-center rounded-lg text-white/80 hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop: sidebar yang bisa dibuka-tutup */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 lg:block",
          collapsed ? "w-20" : "w-64",
        )}
      >
        {panel(collapsed)}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
          aria-expanded={!collapsed}
          className="absolute -right-4 top-1/2 z-10 grid h-16 w-8 -translate-y-1/2 place-items-center rounded-r-xl border border-l-0 border-slate-200 bg-white text-blue-700 shadow-md hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          {collapsed ? <ChevronRight className="size-5" /> : <ChevronLeft className="size-5" />}
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
